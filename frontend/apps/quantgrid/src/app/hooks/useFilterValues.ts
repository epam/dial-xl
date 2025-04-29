import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import { GridListFilter, Viewport } from '@frontend/common';
import {
  collectTableNames,
  escapeTableName,
  ParsedField,
  ParsedTable,
  unescapeFieldName,
  unescapeTableName,
} from '@frontend/parser';

import { ProjectContext, ViewportContext } from '../context';
import { createUniqueName, uniqueId } from '../services';
import { createVirtualTableUniqueFieldValuesDSL } from '../utils';

type SendViewportsParams = {
  targetTableName: string;
  targetFieldName: string;
  getMoreValues?: boolean;
  searchValue: string;
  sort: 1 | -1;
};

type CachedViewports = {
  [tableName: string]: {
    [fieldName: string]: number;
  };
};

const keysPerPage = 1000;

export function useFieldFilterValues() {
  const { viewGridData } = useContext(ViewportContext);
  const {
    projectName,
    sheetName,
    parsedSheets,
    projectSheets,
    sheetContent,
    getVirtualProjectViewport,
  } = useContext(ProjectContext);

  const cachedKeyViewports = useRef<CachedViewports>({});
  const [filterList, setFilterList] = useState<GridListFilter[]>([]);
  const filterTableName = useRef('');
  const filterFieldName = useRef('');
  const filterSearchValue = useRef('');
  const filterSort = useRef<1 | -1>(1);

  /**
   * Get key values that will be used in the filter values dropdown.
   * For each table field:
   * - create a virtual table with unique and sorted values
   * - send a viewport request for the virtual tables
   *
   * Call with targetTableName/targetFieldName to get chart key values for a specific table and field
   */
  const sendGetFilterValuesViewports = useCallback(
    ({
      targetTableName,
      targetFieldName,
      getMoreValues,
      searchValue,
      sort,
    }: SendViewportsParams) => {
      if (!sheetContent) return;

      const virtualRequests: Viewport[] = [];
      const virtualTablesDSL: string[] = [];

      const tables: ParsedTable[] = getTargetTables();

      for (const table of tables) {
        const { tableName } = table;
        const unescapedTableName = unescapeTableName(tableName);

        for (const field of table.fields) {
          const { fieldName } = field.key;

          if (targetFieldName && fieldName !== targetFieldName) continue;

          buildVirtualViewport({
            table,
            field,
            unescapedTableName,
            virtualRequests,
            virtualTablesDSL,
            getMoreValues,
            searchValue,
            sort,
          });
        }
      }

      if (virtualRequests.length > 0 && virtualTablesDSL.length > 0) {
        getVirtualProjectViewport(virtualRequests, virtualTablesDSL);
      }

      function buildVirtualViewport({
        table,
        field,
        unescapedTableName,
        virtualRequests,
        virtualTablesDSL,
        getMoreValues,
        searchValue,
        sort,
      }: {
        table: ParsedTable;
        field: ParsedField;
        unescapedTableName: string;
        virtualRequests: Viewport[];
        virtualTablesDSL: string[];
        getMoreValues?: boolean;
        searchValue: string;
        sort: 1 | -1;
      }) {
        if (!sheetContent) return;

        const { tableName } = table;
        const { fieldName } = field.key;

        const virtualTableName = getOrCreateVirtualTableName(
          tableName,
          fieldName,
          unescapedTableName
        );

        const cachedRowNumber =
          cachedKeyViewports.current[tableName]?.[fieldName] || 0;
        const maxRowNumber = viewGridData.getFieldFilterList(
          tableName,
          fieldName
        ).length;

        if (
          (cachedRowNumber !== 0 && !getMoreValues) ||
          maxRowNumber < cachedRowNumber
        )
          return;

        const baseVirtualRequest = {
          start_row: cachedRowNumber,
          end_row: cachedRowNumber + keysPerPage,
        };

        virtualRequests.push({
          ...baseVirtualRequest,
          fieldKey: {
            field: fieldName,
            table: virtualTableName,
          },
        });

        virtualRequests.push({
          ...baseVirtualRequest,
          fieldKey: {
            field: fieldName + '_filtered',
            table: virtualTableName,
          },
        });

        const virtualTableDSL = createVirtualTableUniqueFieldValuesDSL({
          sheetContent,
          table,
          field,
          virtualTableName,
          searchValue,
          sort,
        });

        virtualTablesDSL.push(virtualTableDSL);

        viewGridData.addFilterKeyVirtualTable(
          tableName,
          fieldName,
          escapeTableName(virtualTableName)
        );

        viewGridData.addFilterKeyVirtualTable(
          tableName,
          fieldName + '_filtered',
          escapeTableName(virtualTableName)
        );

        if (!cachedKeyViewports.current[tableName]) {
          cachedKeyViewports.current[tableName] = {};
        }
        cachedKeyViewports.current[tableName][fieldName] =
          cachedRowNumber + keysPerPage;
      }

      function getOrCreateVirtualTableName(
        tableName: string,
        fieldName: string,
        unescapedTableName: string
      ): string {
        const virtualTableName = viewGridData.getVirtualTableName(
          tableName,
          fieldName
        );

        if (virtualTableName) return unescapeTableName(virtualTableName);

        const sanitizedFieldName = unescapeFieldName(fieldName);

        return createUniqueName(
          `${unescapedTableName}_unique_keys_for_field_${sanitizedFieldName}_${uniqueId()}`,
          collectTableNames(parsedSheets)
        );
      }

      function getTargetTables(): ParsedTable[] {
        const tables: ParsedTable[] = [];
        const parsedSheetTables = viewGridData
          .getTablesData()
          .map((t) => t.table);

        if (targetTableName) {
          const table = parsedSheetTables.find(
            (t) => t.tableName === targetTableName
          );
          if (table) tables.push(table);
        }

        return tables;
      }
    },
    [getVirtualProjectViewport, parsedSheets, sheetContent, viewGridData]
  );

  const isCached = useCallback((tableName: string, fieldName: string) => {
    return !!cachedKeyViewports.current[tableName]?.[fieldName];
  }, []);

  const clearCache = useCallback((tableName: string, fieldName: string) => {
    if (cachedKeyViewports.current[tableName]?.[fieldName] === undefined)
      return;

    cachedKeyViewports.current[tableName][fieldName] = 0;
  }, []);

  const onUpdateFieldFilterList = useCallback(
    ({
      tableName,
      fieldName,
      getMoreValues,
      searchValue,
      sort,
    }: {
      tableName: string;
      fieldName: string;
      getMoreValues?: boolean;
      searchValue: string;
      sort: 1 | -1;
    }) => {
      filterTableName.current = tableName;
      filterFieldName.current = fieldName;
      if (
        !getMoreValues &&
        filterSearchValue.current === searchValue &&
        filterSort.current === sort &&
        isCached(tableName, fieldName)
      ) {
        setFilterList(
          viewGridData.getFieldFilterList(
            filterTableName.current,
            filterFieldName.current
          )
        );

        return;
      }

      if (!getMoreValues) {
        clearCache(filterTableName.current, filterFieldName.current);
      }

      filterSearchValue.current = searchValue;
      filterSort.current = sort;

      sendGetFilterValuesViewports({
        targetTableName: tableName,
        targetFieldName: fieldName,
        getMoreValues,
        searchValue,
        sort,
      });
    },
    [clearCache, isCached, sendGetFilterValuesViewports, viewGridData]
  );

  useEffect(() => {
    const subscription = viewGridData.filtersUpdate$.subscribe(() => {
      if (!filterFieldName.current || !filterTableName.current) return;

      const newFilterListValues = viewGridData.getFieldFilterList(
        filterTableName.current,
        filterFieldName.current
      );

      setFilterList(newFilterListValues);
    });

    return () => subscription.unsubscribe();
  }, [viewGridData]);

  /**
   * Clear cached key (to reload them on next viewport request) when the sheet content changes
   */
  useEffect(() => {
    cachedKeyViewports.current = {};
  }, [sheetContent, sheetName, projectName, projectSheets, viewGridData]);

  return {
    onUpdateFieldFilterList,
    filterList,
  };
}
