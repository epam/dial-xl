import { useCallback, useContext, useEffect, useRef } from 'react';

import { DimensionalSchemaResponse, isComplexType } from '@frontend/common';

import { ProjectContext } from '../context';
import {
  autoFixSingleExpression as fixExpression,
  EventBusMessages,
} from '../services';
import { useDSLUtils, useManualCreateEntityDSL } from './ManualEditDSL';
import useEventBus from './useEventBus';
import { useFindTableKeys } from './useFindTableKeys';

type SavedRequest = {
  action:
    | 'expandTable'
    | 'createTableFromFormula'
    | 'createTableFromDimFormula'
    | 'rowReference';
  projectName: string;
  formula: string;
  col?: number;
  row?: number;
  tableName?: string;
  fieldName?: string;
  keyValues?: string | number;
  expression?: string;
  initialFormula?: string;
};

export const useRequestDimTable = () => {
  const { projectName, functions, parsedSheets, getDimensionalSchema } =
    useContext(ProjectContext);
  const { findTable } = useDSLUtils();
  const {
    createDimensionalTableFromSchema,
    createDimensionalTableFromFormula,
    createSingleValueManualTable,
    createRowReferenceTableFromSchema,
  } = useManualCreateEntityDSL();
  const { findTableKeys } = useFindTableKeys();
  const eventBus = useEventBus<EventBusMessages>();

  const requestRef = useRef<SavedRequest | null>(null);

  const expandDimTable = useCallback(
    (tableName: string, fieldName: string, col: number, row: number) => {
      const table = findTable(tableName);

      if (!table || !projectName) return;

      const tableNameQuoted = tableName;

      const findKey = findTableKeys(table, row);
      const formula = `${tableNameQuoted}.FIND(${findKey})[${fieldName}]`;

      requestRef.current = {
        action: 'expandTable',
        projectName,
        tableName,
        fieldName,
        formula,
        keyValues: findKey,
        col,
        row,
      };

      getDimensionalSchema(formula);
    },
    [findTable, findTableKeys, getDimensionalSchema, projectName]
  );

  const createDimTableFromDimensionFormula = useCallback(
    (col: number, row: number, value: string) => {
      if (!projectName) return;

      const formulaParts = value.split(':');

      if (formulaParts.length !== 2) return;

      const tableName = formulaParts[0].trim();
      const expression = formulaParts[1].trim();
      const formula = fixExpression(expression, functions, parsedSheets);

      requestRef.current = {
        action: 'createTableFromDimFormula',
        formula,
        projectName,
        tableName,
        expression,
        col,
        row,
      };

      getDimensionalSchema(formula);
    },
    [functions, getDimensionalSchema, parsedSheets, projectName]
  );

  const createDimTableFromFormula = useCallback(
    (col: number, row: number, value: string) => {
      if (!projectName) return;

      const equalIndex = value.indexOf('=');

      if (equalIndex === -1) return;

      const tableName = value.slice(0, equalIndex).trim().replaceAll("'", '');
      const expression = value.slice(equalIndex + 1).trim();
      const formula = fixExpression(expression, functions, parsedSheets);

      requestRef.current = {
        action: 'createTableFromFormula',
        initialFormula: value,
        formula,
        projectName,
        tableName,
        expression,
        col,
        row,
      };

      getDimensionalSchema(formula);
    },
    [functions, getDimensionalSchema, parsedSheets, projectName]
  );

  const showRowReference = useCallback(
    (tableName: string, fieldName: string, col: number, row: number) => {
      const table = findTable(tableName);

      if (!table || !projectName) return;

      const tableNameQuoted = tableName;

      const findKey = findTableKeys(table, row);
      const formula = `${tableNameQuoted}(${findKey})[${fieldName}]`;

      requestRef.current = {
        action: 'rowReference',
        projectName,
        tableName,
        fieldName,
        formula,
        keyValues: findKey,
        col,
        row,
      };

      getDimensionalSchema(formula);
    },
    [findTable, findTableKeys, getDimensionalSchema, projectName]
  );

  const handleResponse = useCallback(
    (response: DimensionalSchemaResponse) => {
      if (!requestRef.current) return;

      const savedRequest = requestRef.current;
      const { formula, schema, keys, errorMessage, fieldInfo } =
        response.dimensionalSchemaResponse;

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
        expression,
        col,
        row,
        initialFormula,
      } = savedRequest;

      requestRef.current = null;
      switch (action) {
        case 'createTableFromDimFormula':
          if (!expression || col === undefined || row === undefined) return;

          createDimensionalTableFromFormula(
            col,
            row,
            tableName || '',
            '',
            savedRequest.formula,
            schema,
            keys,
            true
          );
          break;
        case 'createTableFromFormula':
          if (!expression || col === undefined || row === undefined) return;

          if ((errorMessage || !isComplexType(fieldInfo)) && expression) {
            const value = initialFormula?.startsWith("'")
              ? savedRequest.formula
              : `=${savedRequest.formula}`;

            return createSingleValueManualTable(col, row, value, tableName);
          }

          createDimensionalTableFromFormula(
            col,
            row,
            tableName || '',
            '',
            savedRequest.formula,
            schema,
            keys,
            fieldInfo.isNested
          );
          break;
        case 'expandTable':
          if (
            !tableName ||
            !fieldName ||
            !col ||
            !row ||
            keyValues === undefined
          )
            return;
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
        case 'rowReference':
          if (
            !tableName ||
            !fieldName ||
            !col ||
            !row ||
            keyValues === undefined
          )
            return;
          createRowReferenceTableFromSchema(
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
    [
      projectName,
      createDimensionalTableFromFormula,
      createDimensionalTableFromSchema,
      createRowReferenceTableFromSchema,
      createSingleValueManualTable,
    ]
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
    createDimTableFromDimensionFormula,
    showRowReference,
  };
};
