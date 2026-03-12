import { useCallback, useContext } from 'react';
import { toast } from 'react-toastify';

import {
  csvFileExtension,
  DimensionalSchemaResponse,
  isComplexType,
  ResourceMetadata,
  SharedWithMeMetadata,
} from '@frontend/common';

import { WithCustomProgressBar } from '../components';
import { ProjectContext } from '../context';
import { autoFixSingleExpression as fixExpression } from '../services';
import { displayToast, getProjectSheetsRecord } from '../utils';
import {
  CreateExpandedTableParams,
  TableVariant,
  useCreateTableDsl,
  useDSLUtils,
} from './EditDsl';
import { useApiRequests } from './useApiRequests';
import { useFindTableKeys } from './useFindTableKeys';

export type RequestDimSchemaForDimFormulaArgs = {
  col: number;
  row: number;
  value: string;
  newTableName?: string;
  createInNewSheet?: boolean;
};

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
  createInNewSheet?: boolean;
};

export const useRequestDimTable = () => {
  const { getDimensionalSchema } = useApiRequests();
  const {
    projectName,
    functions,
    parsedSheets,
    projectSheets,
    fullProjectPath,
  } = useContext(ProjectContext);
  const { findTable } = useDSLUtils();
  const {
    createSingleValueTable,
    createExpandedTable,
    createMultipleExpandedTables,
  } = useCreateTableDsl();
  const { findTableKeys } = useFindTableKeys();

  const handleDimSchemaResponse = useCallback(
    (
      response: DimensionalSchemaResponse,
      requestOptions: DimSchemaRequestOptions,
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
        createInNewSheet,
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
            isAssignable: fieldInfo.isAssignable,
            createInNewSheet,
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
              !!errorMessage,
            );
          }

          if (!fieldInfo) return;

          createExpandedTable({
            ...createExpandedTableOptions,
            tableName: tableName ?? '',
            isSourceDimField: fieldInfo.isNested,
            type: fieldInfo.type,
            isAssignable: fieldInfo.isAssignable,
            createInNewSheet,
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
            isAssignable: fieldInfo.isAssignable,
          });

          break;
      }
    },
    [projectName, createExpandedTable, createSingleValueTable],
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
        projectPath: fullProjectPath,
        worksheets: getProjectSheetsRecord(projectSheets),
        formula,
      });

      if (!response.success) return;

      handleDimSchemaResponse(response.data, requestOptions);
    },
    [
      findTable,
      findTableKeys,
      getDimensionalSchema,
      handleDimSchemaResponse,
      projectName,
      projectSheets,
      fullProjectPath,
    ],
  );

  const requestDimSchemaForDimFormula = useCallback(
    async ({
      col,
      row,
      value,
      newTableName,
      createInNewSheet = false,
    }: RequestDimSchemaForDimFormulaArgs) => {
      if (!projectName || !projectSheets) return;

      const formulaParts = value.split(':');

      if (formulaParts.length !== 2) return;

      const tableName = newTableName || formulaParts[0].trim();
      const expression = formulaParts[1].trim();
      const formula = fixExpression(expression, functions, parsedSheets);

      const requestOptions: DimSchemaRequestOptions = {
        action: 'requestDimSchemaForDimFormula',
        formula,
        projectName,
        tableName,
        expression,
        createInNewSheet,
        col,
        row,
      };

      const response = await getDimensionalSchema({
        projectPath: fullProjectPath,
        worksheets: getProjectSheetsRecord(projectSheets),
        formula,
      });

      if (!response.success) return;

      handleDimSchemaResponse(response.data, requestOptions);
    },
    [
      functions,
      getDimensionalSchema,
      handleDimSchemaResponse,
      parsedSheets,
      projectName,
      projectSheets,
      fullProjectPath,
    ],
  );

  const requestDimSchemaForFormula = useCallback(
    async (
      col: number,
      row: number,
      value: string,
      createInNewSheet = false,
    ) => {
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
        createInNewSheet,
      };

      const response = await getDimensionalSchema({
        projectPath: fullProjectPath,
        worksheets: getProjectSheetsRecord(projectSheets),
        formula,
      });

      if (!response.success) return;

      handleDimSchemaResponse(response.data, requestOptions);
    },
    [
      functions,
      getDimensionalSchema,
      handleDimSchemaResponse,
      parsedSheets,
      projectName,
      projectSheets,
      fullProjectPath,
    ],
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
        projectPath: fullProjectPath,
        worksheets: getProjectSheetsRecord(projectSheets),
        formula,
      });

      if (!response.success) return;

      handleDimSchemaResponse(response.data, requestOptions);
    },
    [
      findTable,
      findTableKeys,
      getDimensionalSchema,
      handleDimSchemaResponse,
      projectName,
      projectSheets,
      fullProjectPath,
    ],
  );

  // Use case: Take all inputs, ask dim schema for each, and create tables for each valid response in a new sheet
  const requestMultipleDimSchemas = useCallback(
    async (
      inputList: (ResourceMetadata | SharedWithMeMetadata)[],
      inNewSheet: boolean,
    ) => {
      if (!projectName || !projectSheets) return;

      const uploadingToast = toast(WithCustomProgressBar, {
        customProgressBar: true,
        data: {
          message: `Processing ${inputList.length} input${
            inputList.length > 1 ? 's' : ''
          }...`,
        },
      });

      const requests = inputList.map((file) => {
        const formula = `INPUT("${file.url}")`;
        const tableName = file.name.replace(csvFileExtension, '');

        return { formula, tableName };
      });

      let completedRequests = 0;
      const totalRequests = requests.length;

      const responses = await Promise.all(
        requests.map(async ({ formula, tableName }) => {
          const response = await getDimensionalSchema({
            projectPath: fullProjectPath,
            worksheets: getProjectSheetsRecord(projectSheets),
            formula,
          });

          completedRequests++;
          toast.update(uploadingToast, {
            progress: (completedRequests / totalRequests) * 0.9,
          });

          if (!response.success) return null;

          return {
            response: response.data,
            tableName,
            formula,
          };
        }),
      );

      const finalResponses = responses.filter(
        (r): r is NonNullable<typeof r> => r !== null,
      );

      if (!responses || responses.length === 0) {
        toast.dismiss(uploadingToast);

        return;
      }

      const tableCreationRequests = finalResponses
        .map(({ response, tableName }) => {
          const { schema, keys, fieldInfo } =
            response.dimensionalSchemaResponse;

          if (!fieldInfo || !schema || schema.length === 0) return null;

          return {
            tableName,
            formula: response.dimensionalSchemaResponse.formula,
            schema,
            keys,
            type: fieldInfo.type,
            isAssignable: fieldInfo.isAssignable,
            isSourceDimField: true,
          };
        })
        .filter((req): req is NonNullable<typeof req> => req !== null);

      if (tableCreationRequests.length > 0) {
        createMultipleExpandedTables(tableCreationRequests, inNewSheet);
        toast.update(uploadingToast, {
          progress: 1,
        });
        toast.dismiss(uploadingToast);
        displayToast(
          'success',
          `Successfully added ${tableCreationRequests.length} input(s) to project`,
        );
      } else {
        toast.dismiss(uploadingToast);
        displayToast(
          'error',
          'There were some issues adding the inputs. Please check your input files and try again.',
        );
      }
    },
    [
      projectName,
      projectSheets,
      getDimensionalSchema,
      fullProjectPath,
      createMultipleExpandedTables,
    ],
  );

  return {
    expandDimTable,
    requestDimSchemaForFormula,
    requestDimSchemaForDimFormula,
    requestMultipleDimSchemas,
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
