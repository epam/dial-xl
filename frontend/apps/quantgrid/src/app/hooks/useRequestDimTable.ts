import { useCallback, useContext } from 'react';

import { DimensionalSchemaResponse, isComplexType } from '@frontend/common';

import { ProjectContext } from '../context';
import { autoFixSingleExpression as fixExpression } from '../services';
import { getProjectSheetsRecord } from '../utils';
import { useCreateTableDsl } from './EditDsl';
import { useDSLUtils } from './ManualEditDSL';
import { useApiRequests } from './useApiRequests';
import { useFindTableKeys } from './useFindTableKeys';

type DimSchemaRequestOptions = {
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
  const { getDimensionalSchema } = useApiRequests();
  const { projectName, functions, parsedSheets, projectSheets } =
    useContext(ProjectContext);
  const { findTable } = useDSLUtils();
  const {
    createSingleValueTable,
    createDimensionalTableFromSchema,
    createDimensionalTableFromFormula,
    createRowReferenceTableFromSchema,
  } = useCreateTableDsl();
  const { findTableKeys } = useFindTableKeys();

  const handleDimSchemaResponse = useCallback(
    (
      response: DimensionalSchemaResponse,
      requestOptions: DimSchemaRequestOptions
    ) => {
      const { formula, schema, keys, errorMessage, fieldInfo } =
        response.dimensionalSchemaResponse;

      if (
        projectName !== requestOptions?.projectName ||
        formula !== requestOptions?.formula
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
      } = requestOptions;

      switch (action) {
        case 'createTableFromDimFormula':
          if (!expression || col === undefined || row === undefined) return;

          createDimensionalTableFromFormula(
            col,
            row,
            tableName || '',
            '',
            requestOptions.formula,
            schema,
            keys,
            true
          );
          break;
        case 'createTableFromFormula':
          if (!expression || col === undefined || row === undefined) return;

          // Create a regular table if a formula error occurs or if the formula produces a primitive type
          // Display table headers only if the formula contains an error (to show something in the spreadsheet)
          if ((errorMessage || !isComplexType(fieldInfo)) && expression) {
            const value = initialFormula?.startsWith("'")
              ? requestOptions.formula
              : `=${requestOptions.formula}`;

            return createSingleValueTable(
              col,
              row,
              value,
              tableName,
              !!errorMessage
            );
          }

          if (!fieldInfo) return;

          createDimensionalTableFromFormula(
            col,
            row,
            tableName || '',
            '',
            requestOptions.formula,
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
      createSingleValueTable,
    ]
  );

  const expandDimTable = useCallback(
    async (tableName: string, fieldName: string, col: number, row: number) => {
      const table = findTable(tableName);

      if (!table || !projectName || !projectSheets) return;

      const tableNameQuoted = tableName;

      const findKey = findTableKeys(table, col, row);
      const formula = `${tableNameQuoted}.FIND(${findKey})[${fieldName}]`;

      const requestOptions: DimSchemaRequestOptions = {
        action: 'expandTable',
        projectName,
        tableName,
        fieldName,
        formula,
        keyValues: findKey,
        col,
        row,
      };

      const response = await getDimensionalSchema({
        worksheets: getProjectSheetsRecord(projectSheets),
        formula,
      });

      if (!response) return;

      handleDimSchemaResponse(response, requestOptions);
    },
    [
      findTable,
      findTableKeys,
      getDimensionalSchema,
      handleDimSchemaResponse,
      projectName,
      projectSheets,
    ]
  );

  const createDimTableFromDimensionFormula = useCallback(
    async (col: number, row: number, value: string) => {
      if (!projectName || !projectSheets) return;

      const formulaParts = value.split(':');

      if (formulaParts.length !== 2) return;

      const tableName = formulaParts[0].trim();
      const expression = formulaParts[1].trim();
      const formula = fixExpression(expression, functions, parsedSheets);

      const requestOptions: DimSchemaRequestOptions = {
        action: 'createTableFromDimFormula',
        formula,
        projectName,
        tableName,
        expression,
        col,
        row,
      };

      const response = await getDimensionalSchema({
        worksheets: getProjectSheetsRecord(projectSheets),
        formula,
      });

      if (!response) return;

      handleDimSchemaResponse(response, requestOptions);
    },
    [
      functions,
      getDimensionalSchema,
      handleDimSchemaResponse,
      parsedSheets,
      projectName,
      projectSheets,
    ]
  );

  const createDimTableFromFormula = useCallback(
    async (col: number, row: number, value: string) => {
      if (!projectName || !projectSheets) return;

      const equalIndex = value.indexOf('=');

      if (equalIndex === -1) return;

      const tableName = value.slice(0, equalIndex).trim().replaceAll("'", '');
      const expression = value.slice(equalIndex + 1).trim();
      const formula = fixExpression(expression, functions, parsedSheets);

      const requestOptions: DimSchemaRequestOptions = {
        action: 'createTableFromFormula',
        initialFormula: value,
        formula,
        projectName,
        tableName,
        expression,
        col,
        row,
      };

      const response = await getDimensionalSchema({
        worksheets: getProjectSheetsRecord(projectSheets),
        formula,
      });

      if (!response) return;

      handleDimSchemaResponse(response, requestOptions);
    },
    [
      functions,
      getDimensionalSchema,
      handleDimSchemaResponse,
      parsedSheets,
      projectName,
      projectSheets,
    ]
  );

  const showRowReference = useCallback(
    async (tableName: string, fieldName: string, col: number, row: number) => {
      const table = findTable(tableName);

      if (!table || !projectName || !projectSheets) return;

      const tableNameQuoted = tableName;

      const findKey = findTableKeys(table, col, row);
      const formula = `${tableNameQuoted}(${findKey})[${fieldName}]`;

      const requestOptions: DimSchemaRequestOptions = {
        action: 'rowReference',
        projectName,
        tableName,
        fieldName,
        formula,
        keyValues: findKey,
        col,
        row,
      };

      const response = await getDimensionalSchema({
        worksheets: getProjectSheetsRecord(projectSheets),
        formula,
      });

      if (!response) return;

      handleDimSchemaResponse(response, requestOptions);
    },
    [
      findTable,
      findTableKeys,
      getDimensionalSchema,
      handleDimSchemaResponse,
      projectName,
      projectSheets,
    ]
  );

  return {
    expandDimTable,
    createDimTableFromFormula,
    createDimTableFromDimensionFormula,
    showRowReference,
  };
};
