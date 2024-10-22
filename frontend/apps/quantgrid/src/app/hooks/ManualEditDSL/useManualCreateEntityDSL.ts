import { useCallback, useContext } from 'react';

import {
  escapeFieldName,
  escapeTableName,
  unescapeTableName,
  WorksheetState,
} from '@frontend/common';
import {
  dimKeyword,
  getPlacementDecorator,
  hideTableFieldsDecorator,
  hideTableHeaderDecorator,
  horizontalDirectionDecorator,
  keyKeyword,
  manualTableDecorator,
  minTablePlacement,
  newLine,
  overrideKeyword,
  ParsedField,
  sanitizeExpressionOrOverride,
  tableKeyword,
} from '@frontend/parser';

import { ProjectContext } from '../../context';
import {
  autoFixSingleExpression,
  autoTablePlacement,
  createUniqueName,
  generateFieldExpressionFromText,
  getAllTableNames,
} from '../../services';
import { stripNewLinesAtEnd } from '../../utils';
import { useDSLUtils } from './useDSLUtils';

const defaultTableName = 'Table1';
const sourceFieldName = 'source';
const spaces = ' '.repeat(2);

export function useManualCreateEntityDSL() {
  const {
    parsedSheets,
    projectName,
    sheetContent,
    projectSheets,
    functions,
    sheetName,
  } = useContext(ProjectContext);
  const { updateDSL, findTable, findContext } = useDSLUtils();

  const createDerivedTable = useCallback(
    (tableName: string, col?: number, row?: number) => {
      const context = findContext(tableName);

      if (!context || !projectName || !sheetName) return;

      const { table: sourceTable } = context;

      const { fields } = sourceTable;
      const newName = createUniqueName(
        `${unescapeTableName(tableName)}_derived`,
        getAllTableNames(projectSheets)
      );
      const derivedName = escapeTableName(newName);
      const sourceName = escapeTableName(unescapeTableName(tableName));
      const uniqueSourceFieldName = createUniqueName(
        sourceFieldName,
        fields.map((f) => f.key.fieldName)
      );
      const sourceField = `${spaces}${dimKeyword} [${uniqueSourceFieldName}] = ${sourceName}`;
      const derivedFields = fields
        .map(
          (f: ParsedField) =>
            `${spaces}${f.key.fullFieldName} = [${uniqueSourceFieldName}]${f.key.fullFieldName}`
        )
        .join(newLine);

      let newTableCol = col;
      let newTableRow = row;
      if (!newTableCol || !newTableRow) {
        const placement = sourceTable.getPlacement();
        newTableRow = placement[0];
        newTableCol = placement[1] + fields.length + 1;
      }
      const derivedTable = `${getPlacementDecorator(
        newTableCol,
        newTableRow
      )}${newLine}${tableKeyword} ${derivedName}${newLine}${sourceField}${newLine}${derivedFields}`;
      const updatedSheetContent =
        (sheetContent ?? '') + newLine + newLine + derivedTable;

      const historyTitle = `Add derived table "${derivedName}"`;
      updateDSL(updatedSheetContent, historyTitle, sheetName);
    },
    [
      findContext,
      projectName,
      projectSheets,
      sheetContent,
      sheetName,
      updateDSL,
    ]
  );

  const createTable = useCallback(
    (col: number, row: number, value: string) => {
      if (!projectName) return;

      const placementDsl = getPlacementDecorator(
        Math.max(minTablePlacement, col),
        Math.max(minTablePlacement, row)
      );
      const tableName = createUniqueName(
        defaultTableName,
        getAllTableNames(projectSheets)
      );
      const { fieldDsl } = generateFieldExpressionFromText(
        value,
        null,
        functions,
        parsedSheets,
        tableName
      );
      const tableDsl = `${placementDsl}${newLine}${tableKeyword} ${tableName}${newLine}${spaces}${fieldDsl}`;
      const updatedSheetContent = sheetContent
        ? stripNewLinesAtEnd(sheetContent) + newLine + newLine + tableDsl
        : tableDsl;

      const historyTitle = `Add table "${tableName}"`;
      updateDSL(updatedSheetContent, historyTitle);
    },
    [
      projectName,
      projectSheets,
      functions,
      parsedSheets,
      sheetContent,
      updateDSL,
    ]
  );

  const createDimensionTable = useCallback(
    (col: number, row: number, value: string) => {
      if (!projectName) return;
      const tables = value.split(':');

      if (tables.length < 2) return;
      const placementDsl = getPlacementDecorator(
        Math.max(minTablePlacement, col),
        Math.max(minTablePlacement, row)
      );

      const newTableName = escapeTableName(
        createUniqueName(
          unescapeTableName(tables[0]) || defaultTableName,
          getAllTableNames(projectSheets)
        )
      );

      const fields = tables
        .slice(1)
        .map(
          (table, index) =>
            `${spaces}${dimKeyword} [${sourceFieldName}${
              index + 1
            }] = ${autoFixSingleExpression(
              table.trim(),
              functions,
              parsedSheets,
              newTableName
            )}`
        )
        .join(newLine);
      const dimTable = `${placementDsl}${newLine}${tableKeyword} ${newTableName}${newLine}${fields}`;
      const updatedSheetContent = sheetContent
        ? stripNewLinesAtEnd(sheetContent) + newLine + newLine + dimTable
        : dimTable;

      const historyTitle = `Add dimension table "${newTableName}"`;
      updateDSL(updatedSheetContent, historyTitle);
    },
    [
      parsedSheets,
      projectSheets,
      sheetContent,
      updateDSL,
      projectName,
      functions,
    ]
  );

  const getDimensionalTableFromFormula = useCallback(
    (
      tableName: string,
      projectSheets: WorksheetState[] | null,
      isSourceDimField: boolean,
      fieldName: string,
      expression: string,
      schema: string[],
      keys: string[],
      row: number,
      col: number
    ) => {
      const newTableName = escapeTableName(
        createUniqueName(
          unescapeTableName(tableName) || defaultTableName,
          getAllTableNames(projectSheets)
        )
      );
      const dim = isSourceDimField ? `${dimKeyword} ` : '';
      const sourceField = `${spaces}${dim}[${
        fieldName || sourceFieldName
      }] = ${expression}`;
      const tableFields = [sourceFieldName];
      const fields = schema
        .map((f) => {
          const sanitizedFieldName = escapeFieldName(f);
          const uniqueFieldName = createUniqueName(
            sanitizedFieldName,
            tableFields
          );
          tableFields.push(uniqueFieldName);
          const key = keys.includes(f) ? `${keyKeyword} ` : '';

          return `${spaces}${key}[${uniqueFieldName}] = [${
            fieldName || sourceFieldName
          }][${sanitizedFieldName}]`;
        })
        .join(newLine);

      const requiresPlacement =
        row < minTablePlacement || col < minTablePlacement;
      let dimTable = `${tableKeyword} ${newTableName}${newLine}${sourceField}${newLine}${fields}`;

      if (!requiresPlacement) {
        const placementDsl = getPlacementDecorator(
          Math.max(minTablePlacement, col),
          Math.max(minTablePlacement, row)
        );
        dimTable = `${placementDsl}${newLine}${dimTable}`;
      }

      return { dimTable, requiresPlacement, newTableName };
    },
    []
  );

  const createDimensionalTableFromFormula = useCallback(
    (
      col: number,
      row: number,
      tableName: string,
      fieldName: string,
      expression: string,
      schema: string[],
      keys: string[],
      isSourceDimField: boolean
    ) => {
      if (!projectName) return;

      const { dimTable, requiresPlacement, newTableName } =
        getDimensionalTableFromFormula(
          tableName,
          projectSheets,
          isSourceDimField,
          fieldName,
          expression,
          schema,
          keys,
          row,
          col
        );

      let updatedSheetContent = sheetContent
        ? stripNewLinesAtEnd(sheetContent) + newLine + newLine + dimTable
        : dimTable;

      if (requiresPlacement) {
        updatedSheetContent = autoTablePlacement(updatedSheetContent);
      }

      const historyTitle = `Add dimension table "${newTableName}"`;
      updateDSL(updatedSheetContent, historyTitle);
    },
    [
      getDimensionalTableFromFormula,
      projectName,
      projectSheets,
      sheetContent,
      updateDSL,
    ]
  );

  const createDimensionalTableFromSchema = useCallback(
    (
      col: number,
      row: number,
      tableName: string,
      fieldName: string,
      keyValues: string | number,
      formula: string,
      schema: string[],
      keys: string[]
    ) => {
      if (!projectName || !sheetContent) return;

      const targetTable = findTable(tableName);

      if (!targetTable) return;

      const placementDsl = getPlacementDecorator(
        Math.max(minTablePlacement, col),
        Math.max(minTablePlacement, row)
      );
      const sanitizedKeyValues =
        typeof keyValues === 'string'
          ? keyValues.replaceAll(`"`, '')
          : keyValues;
      const newTableName = createUniqueName(
        `${unescapeTableName(tableName)}_(${sanitizedKeyValues})[${fieldName}]`,
        getAllTableNames(projectSheets)
      );

      const sourceField = `${spaces}${dimKeyword} [${sourceFieldName}] = ${formula}`;
      const tableFields = [sourceFieldName];
      const fields = schema
        .map((f) => {
          const sanitizedFieldName = escapeFieldName(f);
          const uniqueFieldName = createUniqueName(
            sanitizedFieldName,
            tableFields
          );
          tableFields.push(uniqueFieldName);
          const key = keys.includes(f) ? `${keyKeyword} ` : '';

          return `${spaces}${key}[${uniqueFieldName}] = [${sourceFieldName}][${sanitizedFieldName}]`;
        })
        .join(newLine);
      const newTable = `${placementDsl}${newLine}${tableKeyword} '${newTableName}'${newLine}${sourceField}${newLine}${fields}`;
      const updatedSheetContent =
        stripNewLinesAtEnd(sheetContent) + newLine + newLine + newTable;

      const historyTitle = `Add dimension table "${newTableName}"`;
      updateDSL(updatedSheetContent, historyTitle);
    },
    [projectName, findTable, projectSheets, sheetContent, updateDSL]
  );

  const createManualTable = useCallback(
    (
      col: number,
      row: number,
      cells: string[][],
      hideTableHeader = false,
      hideFieldHeader = false,
      customTableName?: string
    ) => {
      if (!projectName) return;

      const tableName = createUniqueName(
        customTableName || defaultTableName,
        getAllTableNames(projectSheets)
      );
      const rowOffset = Number(!hideTableHeader) + Number(!hideFieldHeader);
      const placementDsl = getPlacementDecorator(
        Math.max(minTablePlacement, col),
        Math.max(minTablePlacement, row - rowOffset)
      );
      const hideTHDecorator = hideTableHeader
        ? `${hideTableHeaderDecorator}${newLine}`
        : '';
      const hideTFDecorator = hideFieldHeader
        ? `${hideTableFieldsDecorator}${newLine}`
        : '';
      const baseTableDsl = `${hideTHDecorator}${hideTFDecorator}${manualTableDecorator}${newLine}${placementDsl}${newLine}${tableKeyword} ${tableName}${newLine}`;
      let tableFieldsDsl = '';
      let tableOverrideHeaderDsl = `${overrideKeyword}${newLine}`;
      let tableOverrideRowsDsl = '';

      const colsCount = cells[0].length;

      for (let i = 0; i < colsCount; i++) {
        const fieldName = `[Field${i + 1}]`;
        tableFieldsDsl += `${spaces}${fieldName}${newLine}`;
        tableOverrideHeaderDsl += i === 0 ? fieldName : `,${fieldName}`;
      }

      tableOverrideHeaderDsl += newLine;

      for (let row = 0; row < cells.length; row++) {
        for (let col = 0; col < cells[row].length; col++) {
          const value = cells[row][col];
          const overrideValue = sanitizeExpressionOrOverride(value);

          tableOverrideRowsDsl +=
            col === 0 ? overrideValue : `,${overrideValue}`;
        }

        tableOverrideRowsDsl += newLine;
      }

      const manualTableDsl = `${baseTableDsl}${tableFieldsDsl}${tableOverrideHeaderDsl}${tableOverrideRowsDsl}`;
      const updatedSheetContent = sheetContent
        ? stripNewLinesAtEnd(sheetContent) + newLine + newLine + manualTableDsl
        : manualTableDsl;

      const historyTitle = `Add manual table "${tableName}"`;
      updateDSL(updatedSheetContent, historyTitle);
    },
    [projectName, projectSheets, sheetContent, updateDSL]
  );

  const createSingleValueManualTable = useCallback(
    (col: number, row: number, value: string, tableName?: string) => {
      if (tableName) {
        createManualTable(col, row, [[value]], false, true, tableName);
      } else {
        createManualTable(col, row, [[value]], true, true);
      }
    },
    [createManualTable]
  );

  const createRowReferenceTableFromSchema = useCallback(
    (
      col: number,
      row: number,
      tableName: string,
      fieldName: string,
      keyValues: string | number,
      formula: string,
      schema: string[],
      keys: string[]
    ) => {
      if (!projectName || !sheetContent) return;

      const targetTable = findTable(tableName);

      if (!targetTable) return;

      const placementDsl = getPlacementDecorator(
        Math.max(minTablePlacement, col),
        Math.max(minTablePlacement, row)
      );
      const sanitizedKeyValues =
        typeof keyValues === 'string'
          ? keyValues.replaceAll(`"`, '')
          : keyValues;
      const newTableName = createUniqueName(
        `${unescapeTableName(tableName)}_(${sanitizedKeyValues})[${fieldName}]`,
        getAllTableNames(projectSheets)
      );

      const sourceField = `${spaces}[${sourceFieldName}] = ${formula}`;
      const tableFields = [sourceFieldName];
      const fields = schema
        .filter((f) => f !== sourceFieldName)
        .map((f) => {
          const uniqueFieldName = createUniqueName(f, tableFields);
          tableFields.push(uniqueFieldName);
          const key = keys.includes(f) ? `${keyKeyword} ` : '';

          return `${spaces}${key}[${uniqueFieldName}] = [${sourceFieldName}][${f}]`;
        })
        .join(newLine);
      const newTable = `${horizontalDirectionDecorator}${newLine}${placementDsl}${newLine}${tableKeyword} '${newTableName}'${newLine}${sourceField}${newLine}${fields}`;
      const updatedSheetContent =
        stripNewLinesAtEnd(sheetContent) + newLine + newLine + newTable;

      const historyTitle = `Add row reference table "${newTableName}"`;
      updateDSL(updatedSheetContent, historyTitle);
    },
    [projectName, findTable, projectSheets, sheetContent, updateDSL]
  );

  return {
    createTable,
    createDerivedTable,
    createDimensionTable,
    createDimensionalTableFromFormula,
    getDimensionalTableFromFormula,
    createDimensionalTableFromSchema,
    createManualTable,
    createSingleValueManualTable,
    createRowReferenceTableFromSchema,
  };
}
