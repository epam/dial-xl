import { useCallback, useContext } from 'react';

import { dynamicFieldName, ParsedField } from '@frontend/parser';
import {
  findTableInSelection,
  HorizontalDirection,
} from '@frontend/spreadsheet';

import {
  ProjectContext,
  SpreadsheetContext,
  UndoRedoContext,
} from '../../context';
import {
  autoTablePlacement,
  createUniqueName,
  generateFieldExpressionFromText,
  getAllTableNames,
} from '../../services';
import { useDSLUtils } from '../useDSLUtils';
import { useOverridesManualEditDSL } from '../useOverridesManualEditDSL';
import { verifyDslHasSameSetTablesAndFields } from './verifyDslHasSameSetTablesAndFields';
import { verifyDslHasSameSetTablesAndNewField } from './verifyDslHasSameSetTablesAndNewField';

const defaultTableName = 'Table1';
const spaces = ' '.repeat(2);
const tableKeywordLength = 6;

export function useManualEditDSL() {
  const {
    projectName,
    sheetContent,
    parsedSheet,
    projectSheets,
    openStatusModal,
  } = useContext(ProjectContext);
  const {
    updateDSL,
    findTableField,
    findTable,
    findLastTableField,
    findFieldOnLeftOrRight,
    findContext,
  } = useDSLUtils();
  const { gridApi, gridService } = useContext(SpreadsheetContext);
  const { append, appendTo } = useContext(UndoRedoContext);
  const { addOverride, removeOverride, renameOverrideField } =
    useOverridesManualEditDSL();

  const renameTable = useCallback(
    (oldName: string, newName: string) => {
      if (!sheetContent || !parsedSheet) return;

      if (oldName === newName) return;

      const targetTable = findTable(oldName);

      if (!targetTable?.dslTableNamePlacement) return;

      const { end, start } = targetTable.dslTableNamePlacement;

      const uniqueNewTableName = createUniqueName(
        newName.includes(' ') ? `'${newName}'` : newName,
        getAllTableNames(projectSheets)
      );

      const updatedSheetContent =
        sheetContent.substring(0, start) +
        uniqueNewTableName +
        sheetContent.substring(end);

      updateDSL(updatedSheetContent);

      append(
        `Rename table "${oldName}" to "${uniqueNewTableName}"`,
        updatedSheetContent
      );
    },
    [append, findTable, parsedSheet, projectSheets, sheetContent, updateDSL]
  );

  const moveTable = useCallback(
    (tableName: string, rowDelta: number, colDelta: number) => {
      if (!sheetContent) return;

      const targetTable = findTable(tableName);

      if (!targetTable) return;

      const placementDecorator = targetTable.decorators.find(
        ({ decoratorName }) => decoratorName === 'placement'
      );

      let dsl = sheetContent;

      if (placementDecorator) {
        if (rowDelta === 0 && colDelta === 0) return;

        const { start, end } = placementDecorator.dslPlacement;
        const [startRow, startCol] = placementDecorator.params[0] as [
          number,
          number
        ];

        dsl =
          sheetContent.substring(0, start) +
          `!placement(${startRow + rowDelta}, ${startCol + colDelta})` +
          sheetContent.substring(end + 1);

        append(
          `Move table "${tableName}" to (${startRow + rowDelta}, ${
            startCol + colDelta
          })`,
          dsl
        );
      } else {
        if (!targetTable.dslTableNamePlacement) return;
        dsl =
          sheetContent.substring(
            0,
            targetTable.dslTableNamePlacement.start - tableKeywordLength
          ) +
          `!placement(${1 + rowDelta}, ${1 + colDelta})\r\ntable ` +
          sheetContent.substring(targetTable.dslTableNamePlacement.start);
        append(
          `Move table "${tableName}" to (${rowDelta + 1}, ${colDelta + 1})`,
          dsl
        );
      }

      updateDSL(dsl);
    },
    [append, findTable, sheetContent, updateDSL]
  );

  const moveTableTo = useCallback(
    (tableName: string, row: number, col: number) => {
      if (!sheetContent) return;

      const targetTable = findTable(tableName);

      if (!targetTable) return;

      const placementDecorator = targetTable.decorators.find(
        ({ decoratorName }) => decoratorName === 'placement'
      );

      let dsl = sheetContent;

      if (placementDecorator) {
        const { start, end } = placementDecorator.dslPlacement;
        const [startRow, startCol] = placementDecorator.params[0] as [
          number,
          number
        ];

        if (row === startRow && col === startCol) return;

        dsl =
          sheetContent.substring(0, start) +
          `!placement(${row}, ${col})` +
          sheetContent.substring(end + 1);

        append(`Move table "${tableName}" to (${row}, ${col})`, dsl);
      } else {
        if (!targetTable.dslTableNamePlacement) return;
        dsl =
          sheetContent.substring(
            0,
            targetTable.dslTableNamePlacement.start - tableKeywordLength
          ) +
          `!placement(${row}, ${col})\r\ntable ` +
          sheetContent.substring(targetTable.dslTableNamePlacement.start);
        append(`Move table "${tableName}" to (${row}, ${col})`, dsl);
      }

      updateDSL(dsl);
    },
    [append, findTable, sheetContent, updateDSL]
  );

  const renameField = useCallback(
    (tableName: string, oldName: string, newName: string) => {
      if (!sheetContent) return;

      const targetTable = findTable(tableName);
      const targetField = findTableField(tableName, oldName);

      if (!targetTable || !targetField?.dslFieldNamePlacement) return;

      const { end, start } = targetField.dslFieldNamePlacement;

      const sanitizedNewName = newName.replace(/[[\]]/g, '');

      if (sanitizedNewName === oldName) return;

      const fields = targetTable.fields.map((field) => field.key.fieldName);
      const uniqueNewFieldName = createUniqueName(sanitizedNewName, fields);

      let updatedSheetContent = renameOverrideField(
        tableName,
        oldName,
        uniqueNewFieldName
      );

      if (updatedSheetContent) {
        updatedSheetContent =
          updatedSheetContent.substring(0, start) +
          `[${uniqueNewFieldName}]` +
          updatedSheetContent.substring(end);
      } else {
        updatedSheetContent =
          sheetContent.substring(0, start) +
          `[${uniqueNewFieldName}]` +
          sheetContent.substring(end);
      }

      updateDSL(updatedSheetContent);

      append(
        `Rename field [${oldName}] to [${uniqueNewFieldName}] in table "${tableName}"`,
        updatedSheetContent
      );
    },
    [
      append,
      findTable,
      findTableField,
      renameOverrideField,
      sheetContent,
      updateDSL,
    ]
  );

  const editExpression = useCallback(
    (tableName: string, fieldName: string, expression: string) => {
      const context = findContext(tableName, fieldName);

      if (!context || !context.field) return;

      const { table, sheetContent, field } = context;

      let targetField: ParsedField | undefined = field;

      if (field?.isDynamic) {
        targetField = table.fields.find(
          (f) => f.key.fieldName === dynamicFieldName
        );
      }

      if (
        !targetField?.dslFieldNamePlacement ||
        !targetField.expressionMetadata
      )
        return;

      const { end, start } = targetField.expressionMetadata;

      const sanitizedExpression = expression.trimStart().startsWith('=')
        ? expression.trimStart().replace('=', '').trimStart()
        : expression;

      const updatedSheetContent =
        sheetContent.substring(0, start) +
        sanitizedExpression +
        sheetContent.substring(end + 1);

      if (
        verifyDslHasSameSetTablesAndFields(sheetContent, updatedSheetContent)
      ) {
        openStatusModal('Incorrect expression');

        return false;
      }

      updateDSL(updatedSheetContent);

      append(
        `Update expression of field [${fieldName}] in table "${tableName}"`,
        updatedSheetContent
      );

      return true;
    },
    [append, findContext, openStatusModal, updateDSL]
  );

  const deleteTable = useCallback(
    (tableName: string) => {
      const context = findContext(tableName);

      if (!context || !projectName) return;

      const { table, sheetContent, sheetName } = context;

      if (!table?.dslPlacement) return;

      const { startOffset, stopOffset } = table.dslPlacement;

      const updatedSheetContent =
        sheetContent.substring(0, startOffset) +
        sheetContent.substring(stopOffset + 1).replace('\r\n', '');

      updateDSL(updatedSheetContent, sheetName);

      appendTo(
        projectName,
        sheetName,
        `Delete table "${tableName}"`,
        updatedSheetContent
      );
    },
    [projectName, appendTo, updateDSL, findContext]
  );

  const deleteField = useCallback(
    (tableName: string, fieldName: string) => {
      const context = findContext(tableName, fieldName);

      if (!context || !projectName) return;

      const { table, sheetContent, sheetName, field } = context;

      if (!field) return;

      let targetField: ParsedField | undefined = field;

      if (field?.isDynamic) {
        targetField = table.fields.find(
          (f) => f.key.fieldName === dynamicFieldName
        );
      }

      if (!targetField?.dslPlacement) return;

      const { start, end } = targetField.dslPlacement;

      const updatedSheetContent =
        sheetContent.substring(0, start) +
        sheetContent
          .substring(end + 1)
          .replace('\r\n', '')
          .trimStart();

      updateDSL(updatedSheetContent, sheetName);

      appendTo(
        projectName,
        sheetName,
        `Delete field [${fieldName}] from table "${tableName}"`,
        updatedSheetContent
      );
    },
    [findContext, projectName, updateDSL, appendTo]
  );

  const deleteSelectedFieldOrTable = useCallback(() => {
    if (
      !gridApi ||
      !gridService ||
      !sheetContent ||
      gridApi?.isCellEditorOpen()
    )
      return;

    const selection = gridApi.selection$.getValue();
    if (!selection) return;

    const { startCol, endCol, startRow, endRow } = selection;

    const tableStructure = gridService.getTableStructure();
    const tableMeta = findTableInSelection(tableStructure, selection);
    if (!tableMeta) return;

    const { tableName } = tableMeta;

    const tableHeaderRowSelected =
      startRow === tableMeta.startRow || endRow === tableMeta.startRow;
    const entireTableHeaderSelected =
      startCol === tableMeta.startCol && endCol === tableMeta.endCol;
    if (tableHeaderRowSelected && entireTableHeaderSelected) {
      deleteTable(tableName);

      return;
    }

    if (startCol !== endCol) return;

    const table = findTable(tableName);
    if (!table) return;

    let field = table.getFieldByIndex(startCol - tableMeta.startCol);

    if (!field) return;

    if (field.isDynamic) {
      field = findTableField(tableName, dynamicFieldName);

      if (!field) return;
    }

    const { fieldName } = field.key;

    if (
      startRow <= tableMeta.startRow + 1 ||
      endRow <= tableMeta.startRow + 1
    ) {
      deleteField(tableName, fieldName);
    } else {
      const cell = gridService?.getCellValue(startRow, startCol);

      if (!cell || cell.overrideIndex === undefined || cell.value === undefined)
        return;

      removeOverride(tableName, fieldName, cell.overrideIndex, cell.value);
    }
  }, [
    deleteField,
    deleteTable,
    findTable,
    findTableField,
    gridApi,
    gridService,
    removeOverride,
    sheetContent,
  ]);

  const swapFields = useCallback(
    (
      tableName: string,
      rightFieldName: string,
      leftFieldName: string,
      direction: HorizontalDirection
    ) => {
      const rfContext = findContext(tableName, rightFieldName);
      const lfContext = findContext(tableName, leftFieldName);

      if (!rfContext || !lfContext || !projectName) return;

      if (!rfContext.sheetContent) return;

      const { sheetContent, sheetName } = rfContext;
      let rightField = rfContext.field || null;
      let leftField = lfContext.field || null;

      if (rightField?.isDynamic && leftField?.isDynamic) {
        if (direction === 'left') {
          leftField = findFieldOnLeftOrRight(
            tableName,
            rightFieldName,
            direction
          );
          rightField = findTableField(tableName, dynamicFieldName);
        } else {
          rightField = findFieldOnLeftOrRight(
            tableName,
            leftFieldName,
            direction
          );
          leftField = findTableField(tableName, dynamicFieldName);
        }

        if (!leftField || !rightField) return;
      } else if (rightField?.isDynamic) {
        rightField = findTableField(tableName, dynamicFieldName);
      } else if (leftField?.isDynamic) {
        leftField = findTableField(tableName, dynamicFieldName);
      }

      if (!rightField?.dslPlacement || !leftField?.dslPlacement) return;

      const { start: rightStart, end: rightEnd } = rightField.dslPlacement;
      const { start: leftStart, end: leftEnd } = leftField.dslPlacement;

      const updatedSheetContent =
        sheetContent.substring(0, leftStart) +
        sheetContent.substring(rightStart, rightEnd + 1) +
        sheetContent.substring(leftEnd + 1, rightStart) +
        sheetContent.substring(leftStart, leftEnd + 1) +
        sheetContent.substring(rightEnd + 1);

      updateDSL(updatedSheetContent, sheetName);

      appendTo(
        projectName,
        sheetName,
        `Swap fields [${rightFieldName}] and [${leftFieldName}] in table "${tableName}"`,
        updatedSheetContent
      );
    },
    [
      appendTo,
      findContext,
      findFieldOnLeftOrRight,
      findTableField,
      projectName,
      updateDSL,
    ]
  );

  const swapFieldsHandler = useCallback(
    (tableName: string, fieldName: string, direction: HorizontalDirection) => {
      const context = findContext(tableName, fieldName);

      if (!context) return;

      const { table } = context;
      const { fields } = table;

      let rightFieldName = '';
      let leftFieldName = '';

      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];

        if (field.key.fieldName === fieldName) {
          if (direction === 'left') {
            if (i === 0) return;
            rightFieldName = field.key.fieldName;
            leftFieldName = fields[i - 1].key.fieldName;
          } else {
            if (i === fields.length - 1) return;
            rightFieldName = fields[i + 1].key.fieldName;
            leftFieldName = field.key.fieldName;
          }
        }
      }

      if (rightFieldName && leftFieldName) {
        swapFields(tableName, rightFieldName, leftFieldName, direction);
      }
    },
    [findContext, swapFields]
  );

  const addField = useCallback(
    (tableName: string, fieldText: string) => {
      if (!sheetContent) return;

      const targetTable = findTable(tableName);
      const targetField = findLastTableField(tableName);

      if (!targetTable) return;

      let updatedSheetContent = sheetContent;
      const { fieldName, fieldDsl } = generateFieldExpressionFromText(
        fieldText,
        targetTable
      );

      if (targetField?.dslPlacement) {
        const { end, start } = targetField.dslPlacement;
        const spacesMatch = sheetContent
          .substring(0, start)
          .replaceAll('\r\n', '')
          .match(/\s+$/);
        const spacesCount = spacesMatch ? spacesMatch[0].length : 0;

        updatedSheetContent =
          sheetContent.substring(0, end + 1) +
          '\r\n' +
          ' '.repeat(spacesCount) +
          fieldDsl +
          sheetContent.substring(end + 1);
      } else if (targetTable.dslPlacement) {
        const { stopOffset } = targetTable.dslPlacement;

        updatedSheetContent =
          sheetContent.substring(0, stopOffset + 1) +
          '\r\n' +
          spaces +
          fieldDsl +
          sheetContent.substring(stopOffset + 1);
      }

      if (
        verifyDslHasSameSetTablesAndNewField(
          sheetContent,
          updatedSheetContent,
          tableName
        )
      ) {
        openStatusModal('Incorrect expression');

        return false;
      }

      updateDSL(updatedSheetContent);

      append(
        `Add [${fieldName}] to table "${targetTable.tableName}"`,
        updatedSheetContent
      );

      return true;
    },
    [
      append,
      findLastTableField,
      findTable,
      openStatusModal,
      sheetContent,
      updateDSL,
    ]
  );

  const createDerivedTable = useCallback(
    (tableName: string) => {
      const context = findContext(tableName);

      if (!context || !projectName) return;

      const { table, sheetContent, sheetName } = context;

      const { fields } = table;
      const newName = createUniqueName(
        `${tableName}_derived`,
        getAllTableNames(projectSheets)
      );
      const derivedName = newName.includes(' ') ? `'${newName}'` : newName;
      const sourceName = tableName.includes(' ') ? `'${tableName}'` : tableName;
      const sourceField = `${spaces}dim [source] = ${sourceName}`;
      const derivedFields = fields
        .map(
          (f: ParsedField) =>
            `${spaces}${f.key.fullFieldName} = [source]${f.key.fullFieldName}`
        )
        .join('\r\n');
      const [row, col] = table.getPlacement();
      const newCol = col + fields.length + 1;
      const derivedTable = `!placement(${row}, ${newCol})\r\ntable ${derivedName}\r\n${sourceField}\r\n${derivedFields}`;
      const updatedSheetContent = sheetContent + '\r\n\r\n' + derivedTable;

      updateDSL(updatedSheetContent, sheetName);

      appendTo(
        projectName,
        sheetName,
        `Add derived table "${derivedName}"`,
        updatedSheetContent
      );
    },
    [findContext, projectName, projectSheets, updateDSL, appendTo]
  );

  const createTable = useCallback(
    (col: number, row: number, value: string) => {
      if (!parsedSheet) return;

      const tableName = createUniqueName(
        defaultTableName,
        getAllTableNames(projectSheets)
      );
      const { fieldDsl } = generateFieldExpressionFromText(value);
      const tableDsl = `!placement(${row}, ${col})\r\ntable ${tableName}\r\n${spaces}${fieldDsl}`;
      const updatedSheetContent = sheetContent
        ? sheetContent + '\r\n\r\n' + tableDsl
        : tableDsl;

      updateDSL(updatedSheetContent);

      append(`Add table "${tableName}"`, updatedSheetContent);
    },
    [append, projectSheets, parsedSheet, sheetContent, updateDSL]
  );

  const createDimensionTable = useCallback(
    (col: number, row: number, value: string) => {
      if (!parsedSheet) return;

      const tables = value.split(':');

      if (tables.length < 2) return;

      const newTableName = createUniqueName(
        tables[0] || defaultTableName,
        getAllTableNames(projectSheets)
      );
      const fields = tables
        .slice(1)
        .map(
          (table, index) =>
            `${spaces}dim [source${index + 1}] = ${table.trim()}`
        )
        .join('\r\n');
      const dimTable = `!placement(${row}, ${col})\r\ntable ${newTableName}\r\n${fields}`;
      const updatedSheetContent = sheetContent
        ? sheetContent + '\r\n\r\n' + dimTable
        : dimTable;

      updateDSL(updatedSheetContent);

      append(`Add dimension table "${newTableName}"`, updatedSheetContent);
    },
    [append, projectSheets, parsedSheet, sheetContent, updateDSL]
  );

  const createDimensionalTableFromFormula = useCallback(
    (
      col: number,
      row: number,
      formula: string,
      schema: string[],
      keys: string[]
    ) => {
      if (!parsedSheet) return;

      const formulaParts = formula.split(':');

      if (formulaParts.length !== 2) return;

      const newTableName = createUniqueName(
        formulaParts[0] || defaultTableName,
        getAllTableNames(projectSheets)
      );
      const sourceField = `${spaces}dim [source] = ${formulaParts[1]}`;
      const tableFields = ['source'];
      const fields = schema
        .map((f) => {
          const uniqueFieldName = createUniqueName(f, tableFields);
          tableFields.push(uniqueFieldName);
          const key = keys.includes(f) ? 'key ' : '';

          return `${spaces}${key}[${uniqueFieldName}] = [source][${f}]`;
        })
        .join('\r\n');
      const requiresPlacement = row === 0 || col === 0;
      let dimTable = `table ${newTableName}\r\n${sourceField}\r\n${fields}`;

      if (!requiresPlacement) {
        dimTable = `!placement(${row}, ${col})\r\n${dimTable}`;
      }

      let updatedSheetContent = sheetContent
        ? sheetContent + '\r\n\r\n' + dimTable
        : dimTable;

      if (requiresPlacement) {
        updatedSheetContent = autoTablePlacement(updatedSheetContent);
      }

      updateDSL(updatedSheetContent);

      append(`Add dimension table "${newTableName}"`, updatedSheetContent);
    },
    [append, parsedSheet, projectSheets, sheetContent, updateDSL]
  );

  const createDimensionalTableFromSchema = useCallback(
    (
      col: number,
      row: number,
      tableName: string,
      fieldName: string,
      keyValues: string,
      formula: string,
      schema: string[],
      keys: string[]
    ) => {
      if (!sheetContent || !parsedSheet) return;

      const targetTable = findTable(tableName);

      if (!targetTable) return;

      const sanitizedKayValues = keyValues.replaceAll(`"`, '');
      const newTableName = createUniqueName(
        `${tableName}_(${sanitizedKayValues})[${fieldName}]`,
        getAllTableNames(projectSheets)
      );

      const sourceField = `${spaces}dim [source] = ${formula}`;
      const tableFields = ['source'];
      const fields = schema
        .map((f) => {
          const uniqueFieldName = createUniqueName(f, tableFields);
          tableFields.push(uniqueFieldName);
          const key = keys.includes(f) ? 'key ' : '';

          return `${spaces}${key}[${uniqueFieldName}] = [source][${f}]`;
        })
        .join('\r\n');
      const newTable = `!placement(${row}, ${col})\r\ntable '${newTableName}'\r\n${sourceField}\r\n${fields}`;
      const updatedSheetContent = sheetContent + '\r\n\r\n' + newTable;

      updateDSL(updatedSheetContent);

      append(`Add dimension table "${newTableName}"`, updatedSheetContent);
    },
    [append, findTable, parsedSheet, projectSheets, sheetContent, updateDSL]
  );

  const removeDimension = useCallback(
    (tableName: string, fieldName: string) => {
      const context = findContext(tableName, fieldName);

      if (!context || !projectName) return;

      const { sheetContent, sheetName, field } = context;

      if (!sheetContent || !field?.dslDimensionPlacement) return;

      const { start, end } = field.dslDimensionPlacement;

      const updatedSheetContent =
        sheetContent.substring(0, start) +
        sheetContent.substring(end + 1).trimStart();

      updateDSL(updatedSheetContent, sheetName);

      appendTo(
        projectName,
        sheetName,
        `Remove dimension [${fieldName}] from table "${tableName}"`,
        updatedSheetContent
      );
    },
    [appendTo, findContext, projectName, updateDSL]
  );

  const addDimension = useCallback(
    (tableName: string, fieldName: string) => {
      const context = findContext(tableName, fieldName);

      if (!context || !projectName) return;

      const { sheetContent, sheetName, field } = context;

      if (!sheetContent || !field?.dslFieldNamePlacement || field.isDim) return;

      const { start } = field.dslFieldNamePlacement;

      const updatedSheetContent =
        sheetContent.substring(0, start) +
        'dim ' +
        sheetContent.substring(start).trimStart();

      updateDSL(updatedSheetContent, sheetName);

      appendTo(
        projectName,
        sheetName,
        `Add dimension [${fieldName}] to table "${tableName}"`,
        updatedSheetContent
      );
    },
    [appendTo, findContext, projectName, updateDSL]
  );

  const addKey = useCallback(
    (tableName: string, fieldName: string) => {
      const context = findContext(tableName, fieldName);

      if (!context || !projectName) return;

      const { sheetContent, sheetName, field } = context;

      if (!sheetContent || !field?.dslPlacement || field.isKey) return;

      const { start } = field.dslPlacement;

      const updatedSheetContent =
        sheetContent.substring(0, start) +
        'key ' +
        sheetContent.substring(start).trimStart();

      updateDSL(updatedSheetContent, sheetName);

      appendTo(
        projectName,
        sheetName,
        `Add key [${fieldName}] to table "${tableName}"`,
        updatedSheetContent
      );
    },
    [appendTo, findContext, projectName, updateDSL]
  );

  const removeKey = useCallback(
    (tableName: string, fieldName: string) => {
      const context = findContext(tableName, fieldName);

      if (!context || !projectName) return;

      const { sheetContent, sheetName, field } = context;

      if (!sheetContent || !field?.dslKeyPlacement) return;

      const { start, end } = field.dslKeyPlacement;

      const updatedSheetContent =
        sheetContent.substring(0, start) +
        sheetContent.substring(end + 1).trimStart();

      updateDSL(updatedSheetContent, sheetName);

      appendTo(
        projectName,
        sheetName,
        `Remove key [${fieldName}] from table "${tableName}"`,
        updatedSheetContent
      );
    },
    [appendTo, findContext, projectName, updateDSL]
  );

  const createManualTable = useCallback(
    (col: number, row: number, value: string) => {
      if (!parsedSheet) return;

      const tableName = createUniqueName(
        defaultTableName,
        getAllTableNames(projectSheets)
      );
      const fieldDsl = `${spaces}[Field1] = NA`;
      const overrideValue = !isNaN(parseFloat(value))
        ? value.trim()
        : `"${value.trim()}"`;
      const overridesDsl = `override\r\n[Field1]\r\n${overrideValue}`;
      const tableDsl = `!manual()\r\n!placement(${Math.max(
        0,
        row - 2
      )}, ${col})\r\ntable ${tableName}\r\n${fieldDsl}\r\n${overridesDsl}`;
      const updatedSheetContent = sheetContent
        ? sheetContent + '\r\n\r\n' + tableDsl
        : tableDsl;

      updateDSL(updatedSheetContent);

      append(`Add manual table "${tableName}"`, updatedSheetContent);
    },
    [append, projectSheets, parsedSheet, sheetContent, updateDSL]
  );

  const addTableRow = useCallback(
    (col: number, row: number, tableName: string, value: string) => {
      if (!sheetContent) return;

      const targetTable = findTable(tableName);

      if (!targetTable || !targetTable.isManual())
        return createManualTable(col, row, value);

      const [startRow, startCol] = targetTable.getPlacement();
      const targetField = targetTable.fields.find(
        (f, index) => index === col - startCol
      );

      if (!targetField) return;

      return addOverride(
        tableName,
        targetField.key.fieldName,
        row - startRow - 2,
        value
      );
    },
    [addOverride, createManualTable, findTable, sheetContent]
  );

  const chartResize = useCallback(
    (tableName: string, cols: number, rows: number) => {
      const context = findContext(tableName);

      if (!context || !projectName) return;

      const { sheetContent, sheetName, table } = context;

      if (!sheetContent) return;

      const sizeDecorator = table.decorators.find(
        ({ decoratorName }) => decoratorName === 'size'
      );

      let updatedSheetContent = sheetContent;

      if (sizeDecorator) {
        const { start, end } = sizeDecorator.dslPlacement;
        const currentSize = sizeDecorator.params[0] as [number, number];

        if (currentSize[0] === rows && currentSize[1] === cols) return;

        updatedSheetContent =
          sheetContent.substring(0, start) +
          `!size(${rows}, ${cols})` +
          sheetContent.substring(end + 1);
      } else {
        if (!table.dslTableNamePlacement) return;
        updatedSheetContent =
          sheetContent.substring(
            0,
            table.dslTableNamePlacement.start - tableKeywordLength
          ) +
          `!size(${rows}, ${cols})\r\ntable ` +
          sheetContent.substring(table.dslTableNamePlacement.start);
      }

      updateDSL(updatedSheetContent, sheetName);

      appendTo(
        projectName,
        sheetName,
        `Resize chart [${tableName}] to (${rows}, ${cols})`,
        updatedSheetContent
      );
    },
    [appendTo, findContext, projectName, updateDSL]
  );

  const addChart = useCallback(
    (tableName: string) => {
      const context = findContext(tableName);

      if (!context || !projectName) return;

      const { table, sheetContent, sheetName } = context;

      if (!table?.dslPlacement || !table.dslTableNamePlacement) return;

      const { stopOffset } = table.dslPlacement;
      const { end } = table.dslTableNamePlacement;

      const chartTableName = createUniqueName(
        `${tableName}_chart`,
        getAllTableNames(projectSheets)
      );

      const [row, col] = table.getPlacement();
      const newCol = col + table.fields.length + 1;

      const decorators = table.decorators
        .filter(
          (d) =>
            d.decoratorName !== 'visualization' &&
            d.decoratorName !== 'size' &&
            d.decoratorName !== 'placement'
        )
        .map((d) => `!${d.decoratorName}(${d.params.join(',')})\r\n`);

      const chartTable =
        'table ' + chartTableName + sheetContent.substring(end, stopOffset + 1);

      const updatedSheetContent =
        sheetContent +
        `\r\n\r\n!visualization("line-chart")\r\n` +
        `!placement(${row},${newCol})\r\n` +
        decorators +
        chartTable;

      updateDSL(updatedSheetContent, sheetName);

      appendTo(
        projectName,
        sheetName,
        `Add chart "${chartTableName}"`,
        updatedSheetContent
      );
    },
    [findContext, projectName, projectSheets, updateDSL, appendTo]
  );

  const convertToChart = useCallback(
    (tableName: string) => {
      const context = findContext(tableName);

      if (!context || !projectName) return;

      const { table, sheetContent, sheetName } = context;

      const chartDecorator = table.decorators.find(
        ({ decoratorName }) => decoratorName === 'visualization'
      );

      if (chartDecorator || !table.dslTableNamePlacement) return;

      const { start } = table.dslTableNamePlacement;

      const updatedSheetContent =
        sheetContent.substring(0, start - tableKeywordLength) +
        `!visualization("line-chart")\r\ntable ` +
        sheetContent.substring(start);

      updateDSL(updatedSheetContent, sheetName);

      appendTo(
        projectName,
        sheetName,
        `Convert table "${tableName}" to chart`,
        updatedSheetContent
      );
    },
    [projectName, appendTo, updateDSL, findContext]
  );

  const convertToTable = useCallback(
    (tableName: string) => {
      const context = findContext(tableName);

      if (!context || !projectName) return;

      const { table, sheetContent, sheetName } = context;

      const chartDecorator = table.decorators.find(
        ({ decoratorName }) => decoratorName === 'visualization'
      );

      if (
        !chartDecorator ||
        !table.dslPlacement ||
        !table.dslTableNamePlacement
      )
        return;

      const { startOffset } = table.dslPlacement;
      const { start } = table.dslTableNamePlacement;

      const decorators = table.decorators
        .filter(
          (d) =>
            d.decoratorName !== 'visualization' && d.decoratorName !== 'size'
        )
        .map((d) => `!${d.decoratorName}(${d.params.join(',')})\r\n`);

      const updatedSheetContent =
        sheetContent.substring(0, startOffset) +
        decorators +
        'table ' +
        sheetContent.substring(start);

      updateDSL(updatedSheetContent, sheetName);

      appendTo(
        projectName,
        sheetName,
        `Convert chart "${tableName}" to table`,
        updatedSheetContent
      );
    },
    [projectName, appendTo, updateDSL, findContext]
  );

  return {
    addChart,
    addDimension,
    addField,
    addKey,
    addTableRow,
    chartResize,
    convertToChart,
    convertToTable,
    createDerivedTable,
    createDimensionTable,
    createDimensionalTableFromFormula,
    createDimensionalTableFromSchema,
    createManualTable,
    createTable,
    deleteField,
    deleteSelectedFieldOrTable,
    deleteTable,
    editExpression,
    moveTable,
    moveTableTo,
    removeDimension,
    removeKey,
    renameField,
    renameTable,
    swapFields,
    swapFieldsHandler,
  };
}
