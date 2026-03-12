import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ControlData, FieldKey } from '@frontend/common';
import {
  FunctionExpression,
  unescapeFieldName,
  unescapeTableName,
} from '@frontend/parser';

import { ProjectContext } from '../context';
import { extractSelectedValues, getControlType } from './EditDsl';
import { useApiRequests } from './useApiRequests';

type CachedViewports = {
  [tableName: string]: {
    [fieldName: string]: number;
  };
};

type StoredControlData = {
  [tableName: string]: {
    [fieldName: string]: ControlData;
  };
};

const keysPerPage = 1000;

export function useControlValues() {
  const { projectName, parsedSheets, parsedSheet, projectSheets } =
    useContext(ProjectContext);

  const { calculateControlValues } = useApiRequests();

  const cachedKeyViewports = useRef<CachedViewports>({});
  const storedControlData = useRef<StoredControlData>({});

  const [controlData, setControlData] = useState<ControlData | null>(null);
  const [controlIsLoading, setControlIsLoading] = useState(false);
  const controlTableName = useRef('');
  const controlFieldName = useRef('');
  const controlSearchValue = useRef('');

  const selectedValuesMap = useMemo(() => {
    const result = new Map<string, string[]>();

    parsedSheet?.tables.forEach((table) => {
      table.fields.forEach((field) => {
        const formula = field.expressionMetadata?.text;
        const parsedFormula = field.expression;

        if (!formula || !parsedFormula || !getControlType(formula)) return;
        if (!(parsedFormula instanceof FunctionExpression)) return;

        const values = extractSelectedValues(parsedFormula);

        if (values.length === 0) return;

        const key = `${table.tableName}:${field.key.fieldName}`;
        result.set(key, values);
      });
    });

    return result;
  }, [parsedSheet]);

  const sendGetControlValuesRequest = useCallback(
    async ({
      tableName,
      fieldName,
      getMoreValues,
      searchValue,
    }: {
      tableName: string;
      fieldName: string;
      getMoreValues?: boolean;
      searchValue: string;
    }) => {
      if (!projectName || !projectSheets) return;

      setControlIsLoading(true);

      const sheets = projectSheets.reduce(
        (acc, sheet) => {
          acc[sheet.sheetName] = sheet.content;

          return acc;
        },
        {} as Record<string, string>,
      );

      const key: FieldKey = {
        table: unescapeTableName(tableName),
        field: unescapeFieldName(fieldName),
      };

      const cachedRowNumber =
        cachedKeyViewports.current[tableName]?.[fieldName] || 0;

      const start_row = getMoreValues ? cachedRowNumber : 0;
      const end_row = start_row + keysPerPage;

      // Update cache before sending request to prevent duplicate requests
      if (!cachedKeyViewports.current[tableName]) {
        cachedKeyViewports.current[tableName] = {};
      }
      cachedKeyViewports.current[tableName][fieldName] = end_row;

      try {
        const response = await calculateControlValues({
          project: projectName,
          sheets,
          key,
          query: searchValue,
          start_row,
          end_row,
        });

        if (!response.success) {
          // Rollback cache on error
          cachedKeyViewports.current[tableName][fieldName] = cachedRowNumber;
          setControlIsLoading(false);

          return;
        }

        // Extract data from the response wrapper
        const selectedValuesKey = `${tableName}:${fieldName}`;
        const selectedValues = selectedValuesMap.get(selectedValuesKey) || [];

        const responseData = {
          data: response.data.controlValuesResponse.data,
          available: response.data.controlValuesResponse.available,
          selectedValues,
        };

        // Store data
        if (!storedControlData.current[tableName]) {
          storedControlData.current[tableName] = {};
        }

        const existingData = storedControlData.current[tableName][fieldName];

        if (getMoreValues && existingData) {
          // Append new data to existing
          storedControlData.current[tableName][fieldName] = {
            data: {
              ...responseData.data,
              data: [...existingData.data.data, ...responseData.data.data],
            },
            available: {
              ...responseData.available,
              data: [
                ...existingData.available.data,
                ...responseData.available.data,
              ],
            },
            selectedValues,
          };
        } else {
          // Replace it with new data
          storedControlData.current[tableName][fieldName] = responseData;
        }

        // Update state if this is the current control
        if (
          controlTableName.current === tableName &&
          controlFieldName.current === fieldName &&
          controlSearchValue.current === searchValue
        ) {
          setControlData(storedControlData.current[tableName][fieldName]);
        }

        setControlIsLoading(false);
      } catch (error) {
        // Rollback cache on error
        cachedKeyViewports.current[tableName][fieldName] = cachedRowNumber;
        setControlIsLoading(false);
      }
    },
    [calculateControlValues, projectName, projectSheets, selectedValuesMap],
  );

  const isCached = useCallback((tableName: string, fieldName: string) => {
    return !!cachedKeyViewports.current[tableName]?.[fieldName];
  }, []);

  const clearCache = useCallback((tableName: string, fieldName: string) => {
    if (cachedKeyViewports.current[tableName]?.[fieldName] === undefined)
      return;

    cachedKeyViewports.current[tableName][fieldName] = 0;

    if (storedControlData.current[tableName]?.[fieldName]) {
      delete storedControlData.current[tableName][fieldName];
    }
  }, []);

  const onUpdateControlValues = useCallback(
    ({
      tableName,
      fieldName,
      getMoreValues,
      searchValue,
    }: {
      tableName: string;
      fieldName: string;
      getMoreValues?: boolean;
      searchValue: string;
    }) => {
      controlTableName.current = tableName;
      controlFieldName.current = fieldName;

      // If searchValue changed, clear the cache and start over
      const searchValueChanged = controlSearchValue.current !== searchValue;
      if (searchValueChanged && !getMoreValues) {
        clearCache(tableName, fieldName);
      }

      // Return cached data if available
      if (
        !getMoreValues &&
        !searchValueChanged &&
        isCached(tableName, fieldName)
      ) {
        const cachedData = storedControlData.current[tableName]?.[fieldName];
        if (cachedData) {
          setControlData(cachedData);
        }

        return;
      }

      if (getMoreValues) {
        const existingData = storedControlData.current[tableName]?.[fieldName];
        if (existingData) {
          const dataTotalRows = Number(existingData.data.totalRows);
          const availableTotalRows = Number(existingData.available.totalRows);
          const currentDataLength = existingData.data.data.length;
          const currentAvailableLength = existingData.available.data.length;

          // Check if all data has been loaded
          if (
            currentDataLength >= dataTotalRows &&
            currentAvailableLength >= availableTotalRows
          ) {
            return;
          }
        }
      }

      if (!getMoreValues && !searchValueChanged) {
        clearCache(tableName, fieldName);
      }

      controlSearchValue.current = searchValue;

      sendGetControlValuesRequest({
        tableName,
        fieldName,
        getMoreValues,
        searchValue,
      });
    },
    [clearCache, isCached, sendGetControlValuesRequest],
  );

  const onCloseControl = useCallback(() => {
    if (controlSearchValue.current) {
      cachedKeyViewports.current = {};
      storedControlData.current = {};
    }

    controlTableName.current = '';
    controlFieldName.current = '';
    controlSearchValue.current = '';
    setControlData(null);
    setControlIsLoading(false);
  }, []);

  /**
   * Clear cached data when the sheet content changes
   */
  useEffect(() => {
    cachedKeyViewports.current = {};
    storedControlData.current = {};

    onCloseControl();
  }, [parsedSheets, onCloseControl]);

  return {
    onUpdateControlValues,
    onCloseControl,
    controlData,
    controlIsLoading,
  };
}
