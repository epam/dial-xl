import { useCallback, useContext } from 'react';

import { DimensionalSchemaResponse, isComplexType } from '@frontend/common';

import { ProjectContext } from '../context';
import { autoFixSingleExpression as fixExpression } from '../services';
import { getProjectSheetsRecord } from '../utils';
import {
  CreateExpandedTableParams,
  TableVariant,
  useCreateTableDsl,
  useDSLUtils,
} from './EditDsl';
import { useApiRequests } from './useApiRequests';
import { useFindTableKeys } from './useFindTableKeys';

type DimSchemaRequestOptions = {
  action:
    | 'expandTable'
    | 'requestDimSchemaForFormula'
    | 'requestDimSchemaForDimFormula'
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
  const { createSingleValueTable, createExpandedTable } = useCreateTableDsl();
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

      if (col === undefined || row === undefined) return;

      const createExpandedTableOptions: Pick<
        CreateExpandedTableParams,
        'col' | 'row' | 'variant' | 'formula' | 'schema' | 'keys'
      > = {
        col,
        row,
        formula,
        schema,
        keys,
        variant: actionToVariant[action],
      };

      switch (action) {
        case 'requestDimSchemaForDimFormula':
          if (!expression || !fieldInfo) return;

          createExpandedTable({
            ...createExpandedTableOptions,
            tableName: tableName ?? '',
            isSourceDimField: true,
            type: fieldInfo.type,
          });

          break;
        case 'requestDimSchemaForFormula':
          if (!expression) return;

          // Create a regular table if a formula error occurs or if the formula produces a primitive type
          // Display table headers only if the formula contains an error (to show something in the spreadsheet)
          if ((errorMessage || !isComplexType(fieldInfo)) && expression) {
            const value = initialFormula?.startsWith("'")
              ? formula
              : `=${formula}`;

            return createSingleValueTable(
              col,
              row,
              value,
              tableName,
              !!errorMessage
            );
          }

          if (!fieldInfo) return;

          createExpandedTable({
            ...createExpandedTableOptions,
            tableName: tableName ?? '',
            isSourceDimField: fieldInfo.isNested,
            type: fieldInfo.type,
          });

          break;
        case 'expandTable':
        case 'rowReference':
          if (!tableName || !fieldName || !fieldInfo || keyValues === undefined)
            return;

          createExpandedTable({
            ...createExpandedTableOptions,
            keyValues,
            tableName,
            fieldName,
            type: fieldInfo.type,
          });

          break;
      }
    },
    [projectName, createExpandedTable, createSingleValueTable]
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

  const requestDimSchemaForDimFormula = useCallback(
    async (col: number, row: number, value: string) => {
      if (!projectName || !projectSheets) return;

      const formulaParts = value.split(':');

      if (formulaParts.length !== 2) return;

      const tableName = formulaParts[0].trim();
      const expression = formulaParts[1].trim();
      const formula = fixExpression(expression, functions, parsedSheets);

      const requestOptions: DimSchemaRequestOptions = {
        action: 'requestDimSchemaForDimFormula',
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

  const requestDimSchemaForFormula = useCallback(
    async (col: number, row: number, value: string) => {
      if (!projectName || !projectSheets) return;

      const equalIndex = value.indexOf('=');

      if (equalIndex === -1) return;

      const tableName = value.slice(0, equalIndex).trim().replaceAll("'", '');
      const expression = value.slice(equalIndex + 1).trim();
      const formula = fixExpression(expression, functions, parsedSheets);

      const requestOptions: DimSchemaRequestOptions = {
        action: 'requestDimSchemaForFormula',
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
    requestDimSchemaForFormula,
    requestDimSchemaForDimFormula,
    showRowReference,
  };
};

const actionToVariant: Record<DimSchemaRequestOptions['action'], TableVariant> =
  {
    requestDimSchemaForDimFormula: 'dimFormula',
    requestDimSchemaForFormula: 'dimFormula',
    expandTable: 'expand',
    rowReference: 'rowReference',
  };
