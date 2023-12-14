import { useCallback, useContext, useEffect, useRef } from 'react';

import { ColumnDataType, DimensionalSchemaResponse } from '@frontend/common';

import { ProjectContext, SpreadsheetContext } from '../context';
import { EventBusMessages } from '../services';
import { useApi } from './useApi';
import { useDSLUtils } from './useDSLUtils';
import useEventBus from './useEventBus';
import { useManualEditDSL } from './useManualEditDSL';

type SavedRequest = {
  action: 'expandTable' | 'createTable';
  projectName: string;
  formula: string;
  col?: number;
  row?: number;
  initialFormula?: string;
  tableName?: string;
  fieldName?: string;
  keyValues?: string;
};

export const useRequestDimTable = () => {
  const { gridService } = useContext(SpreadsheetContext);
  const { projectName } = useContext(ProjectContext);
  const { findTable } = useDSLUtils();
  const {
    createDimensionalTableFromSchema,
    createDimensionalTableFromFormula,
  } = useManualEditDSL();
  const { getDimensionalSchema } = useApi();
  const eventBus = useEventBus<EventBusMessages>();

  const requestRef = useRef<SavedRequest | null>(null);

  const expandDimTable = useCallback(
    (tableName: string, fieldName: string, col: number, row: number) => {
      const table = findTable(tableName);

      if (!table || !projectName) return;

      const tableKeys = table.fields
        .filter((f) => f.isKey)
        .map((f) => f.key.fieldName);

      const [, startCol] = table.getPlacement();
      const keyValues: string[] = [];

      tableKeys.forEach((key) => {
        const tableFieldIndex = table.fields.findIndex(
          (f) => f.key.fieldName === key
        );
        const sheetCol = tableFieldIndex + startCol;
        const cell = gridService?.getCellValue(row, sheetCol);

        if (key && cell?.value) {
          const formattedValue =
            cell?.field?.type === ColumnDataType.STRING
              ? `"${cell.value}"`
              : cell.value;
          keyValues.push(formattedValue);
        }
      });

      const values = keyValues.join(',');
      const tableNameQuoted = table.isTableNameQuoted
        ? `'${tableName}'`
        : tableName;
      const formula = `${tableNameQuoted}.FIND(${values})[${fieldName}]`;

      requestRef.current = {
        action: 'expandTable',
        projectName,
        tableName,
        fieldName,
        formula,
        keyValues: values,
        col,
        row,
      };

      getDimensionalSchema(projectName, formula);
    },
    [findTable, getDimensionalSchema, gridService, projectName]
  );

  const createDimTableFromFormula = useCallback(
    (col: number, row: number, value: string) => {
      if (!projectName) return;

      const formulaParts = value.split(':');

      if (formulaParts.length !== 2) return;

      const formula = formulaParts[1];

      requestRef.current = {
        action: 'createTable',
        initialFormula: value,
        formula,
        projectName,
        col,
        row,
      };

      getDimensionalSchema(projectName, formula);
    },
    [getDimensionalSchema, projectName]
  );

  const handleResponse = useCallback(
    (response: DimensionalSchemaResponse) => {
      if (!requestRef.current) return;

      const savedRequest = requestRef.current;
      const { projectName, formula, schema, keys } = response;

      if (
        projectName !== savedRequest?.projectName ||
        formula !== savedRequest?.formula
      )
        return;

      const {
        tableName,
        fieldName,
        keyValues,
        action,
        initialFormula,
        col,
        row,
      } = savedRequest;

      switch (action) {
        case 'createTable':
          if (!initialFormula || col === undefined || row === undefined) return;
          createDimensionalTableFromFormula(
            col,
            row,
            initialFormula,
            schema,
            keys
          );
          break;
        case 'expandTable':
          if (!tableName || !keyValues || !fieldName || !col || !row) return;
          createDimensionalTableFromSchema(
            col,
            row,
            tableName,
            fieldName,
            keyValues,
            formula,
            schema,
            keys
          );
          break;
      }
    },
    [createDimensionalTableFromSchema, createDimensionalTableFromFormula]
  );

  useEffect(() => {
    const apiResponseListener = eventBus.subscribe(
      'DimensionalSchemaResponse',
      handleResponse
    );

    return () => {
      apiResponseListener.unsubscribe();
    };
  }, [eventBus, handleResponse]);

  return {
    expandDimTable,
    createDimTableFromFormula,
  };
};
