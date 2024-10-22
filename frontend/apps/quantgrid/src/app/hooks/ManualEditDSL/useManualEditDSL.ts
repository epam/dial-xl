import { useCallback, useContext } from 'react';

import {
  escapeFieldName,
  escapeTableName,
  noteToComment,
  unescapeTableName,
} from '@frontend/common';
import {
  dimKeyword,
  dynamicFieldName,
  getPlacementDecorator,
  hideTableFieldsDecorator,
  hideTableFieldsDecoratorName,
  hideTableHeaderDecorator,
  hideTableHeaderDecoratorName,
  horizontalDirectionDecorator,
  horizontalDirectionDecoratorName,
  keyKeyword,
  naExpression,
  newLine,
  OverrideValue,
  ParsedField,
  placementDecoratorName,
  tableKeyword,
} from '@frontend/parser';
import {
  findTablesInSelection,
  HorizontalDirection,
  isTableInsideSelection,
} from '@frontend/spreadsheet';

import { ProjectContext, ViewportContext } from '../../context';
import {
  autoFixSingleExpression,
  createUniqueName,
  getAllTableNames,
  sanitizeExpression,
} from '../../services';
import {
  addFieldToSheet,
  addOverridesToSheet,
  stripNewLinesAtEnd,
} from '../../utils';
import { useGridApi } from '../useGridApi';
import { useApplyFilterManualEditDSL } from './useApplyFilterManualEditDSL';
import { useApplySortManualEditDSL } from './useApplySortManualEditDSL';
import { useDSLUtils } from './useDSLUtils';
import { useManualDeleteTableDSL } from './useManualDeleteTableDSL';
import {
  removeOverrideDSL,
  useOverridesManualEditDSL,
} from './useOverridesManualEditDSL';
import { useTotalManualEditDSL } from './useTotalManualEditDSL';

const tableKeywordLength = 6;

export function useManualEditDSL() {
  const {
    parsedSheets,
    projectName,
    sheetContent,
    projectSheets,
    functions,
    sheetName,
    selectedCell,
  } = useContext(ProjectContext);
  const { viewGridData } = useContext(ViewportContext);
  const {
    updateDSL,
    findTableField,
    findTable,
    findLastTableField,
    findFieldOnLeftOrRight,
    findContext,
    updateFieldSize,
  } = useDSLUtils();
  const gridApi = useGridApi();
  const { deleteTable, deleteTables } = useManualDeleteTableDSL();
  const {
    removeOverride,
    renameOverrideField,
    removeFieldOverride,
    removeOverrideRow,
  } = useOverridesManualEditDSL();
  const { renameSortField, removeSortField } = useApplySortManualEditDSL();
  const { renameFilterField, removeFilterField } =
    useApplyFilterManualEditDSL();
  const { removeTotalByIndex, renameTotalField, removeTotalByField } =
    useTotalManualEditDSL();

  const renameTable = useCallback(
    (oldName: string, newName: string) => {
      if (!projectName || !sheetContent) return;

      if (oldName === newName) return;

      const targetTable = findTable(oldName);

      if (!targetTable?.dslTableNamePlacement) return;

      const { end, start } = targetTable.dslTableNamePlacement;

      const uniqueNewTableName = escapeTableName(
        createUniqueName(
          unescapeTableName(newName),
          getAllTableNames(projectSheets)
        )
      );

      const updatedSheetContent =
        sheetContent.substring(0, start) +
        uniqueNewTableName +
        sheetContent.substring(end);

      const historyTitle = `Rename table "${oldName}" to "${uniqueNewTableName}"`;
      updateDSL(updatedSheetContent, historyTitle);
    },
    [projectName, findTable, projectSheets, sheetContent, updateDSL]
  );

  const moveTable = useCallback(
    (tableName: string, rowDelta: number, colDelta: number) => {
      if (!projectName || !sheetContent) return;

      const targetTable = findTable(tableName);

      if (!targetTable) return;

      const placementDecorator = targetTable.decorators.find(
        ({ decoratorName }) => decoratorName === 'placement'
      );

      let dsl = sheetContent;

      if (placementDecorator?.dslPlacement) {
        if (rowDelta === 0 && colDelta === 0) return;

        const { start, end } = placementDecorator.dslPlacement;
        const [startRow, startCol] = placementDecorator.params[0] as [
          number,
          number
        ];

        dsl =
          sheetContent.substring(0, start) +
          getPlacementDecorator(startCol + colDelta, startRow + rowDelta) +
          newLine +
          sheetContent.substring(end);

        const historyTitle = `Move table "${tableName}" to (${
          startRow + rowDelta
        }, ${startCol + colDelta})`;
        updateDSL(dsl, historyTitle);
      } else {
        if (!targetTable.dslTableNamePlacement) return;
        dsl =
          sheetContent.substring(
            0,
            targetTable.dslTableNamePlacement.start - tableKeywordLength
          ) +
          getPlacementDecorator(1 + colDelta, 1 + rowDelta) +
          `${newLine}${tableKeyword} ` +
          sheetContent.substring(targetTable.dslTableNamePlacement.start);

        const historyTitle = `Move table "${tableName}" to (${rowDelta + 1}, ${
          colDelta + 1
        })`;
        updateDSL(dsl, historyTitle);
      }
    },
    [projectName, findTable, sheetContent, updateDSL]
  );

  const moveTableTo = useCallback(
    (tableName: string, row: number, col: number) => {
      if (!projectName || !sheetContent) return;

      const targetTable = findTable(tableName);

      if (!targetTable) return;

      const placementDecorator = targetTable.decorators.find(
        ({ decoratorName }) => decoratorName === placementDecoratorName
      );

      let dsl = sheetContent;

      if (placementDecorator?.dslPlacement) {
        const { start, end } = placementDecorator.dslPlacement;
        const [startRow, startCol] = placementDecorator.params[0] as [
          number,
          number
        ];

        if (row === startRow && col === startCol) return;

        dsl =
          sheetContent.substring(0, start) +
          getPlacementDecorator(col, row) +
          newLine +
          sheetContent.substring(end);

        const historyTitle = `Move table "${tableName}" to (${row}, ${col})`;
        updateDSL(dsl, historyTitle);
      } else {
        if (!targetTable.dslTableNamePlacement) return;
        dsl =
          sheetContent.substring(
            0,
            targetTable.dslTableNamePlacement.start - tableKeywordLength
          ) +
          `!placement(${row}, ${col})${newLine}${tableKeyword} ` +
          sheetContent.substring(targetTable.dslTableNamePlacement.start);

        const historyTitle = `Move table "${tableName}" to (${row}, ${col})`;
        updateDSL(dsl, historyTitle);
      }
    },
    [projectName, findTable, sheetContent, updateDSL]
  );

  const renameField = useCallback(
    (tableName: string, oldName: string, newName: string) => {
      if (!projectName || !sheetContent) return;

      const targetTable = findTable(tableName);
      const targetField = findTableField(tableName, oldName);

      if (!targetTable || !targetField?.dslFieldNamePlacement) return;

      const { end, start } = targetField.dslFieldNamePlacement;

      const sanitizedNewName = escapeFieldName(newName);

      if (sanitizedNewName === oldName) return;

      const fields = targetTable.fields.map((field) => field.key.fieldName);
      const uniqueNewFieldName = createUniqueName(sanitizedNewName, fields);

      let updatedSheetContent = renameOverrideField(
        tableName,
        oldName,
        uniqueNewFieldName
      );

      updatedSheetContent = renameSortField(
        tableName,
        oldName,
        uniqueNewFieldName,
        updatedSheetContent || sheetContent
      );

      updatedSheetContent = renameFilterField(
        tableName,
        oldName,
        uniqueNewFieldName,
        updatedSheetContent || sheetContent
      );

      updatedSheetContent = renameTotalField(
        tableName,
        oldName,
        uniqueNewFieldName,
        updatedSheetContent || sheetContent
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

      const historyTitle = `Rename field [${oldName}] to [${uniqueNewFieldName}] in table "${tableName}"`;
      updateDSL(updatedSheetContent, historyTitle);
    },
    [
      projectName,
      findTable,
      findTableField,
      renameOverrideField,
      sheetContent,
      updateDSL,
      renameFilterField,
      renameSortField,
      renameTotalField,
    ]
  );

  const editExpression = useCallback(
    (tableName: string, fieldName: string, expression: string) => {
      const context = findContext(tableName, fieldName);

      if (!projectName || !context || !context.field) return;

      const { table, sheetContent, field } = context;

      let targetField: ParsedField | undefined = field;

      if (field?.isDynamic) {
        targetField = table.fields.find(
          (f) => f.key.fieldName === dynamicFieldName
        );
      }

      if (!targetField?.dslFieldNamePlacement) return;

      const { expressionMetadata, dslFieldNamePlacement } = targetField;
      const initialExpression = expressionMetadata?.text || '';
      const sanitizedExpression = sanitizeExpression(
        expression,
        initialExpression
      );
      const fixedExpression = autoFixSingleExpression(
        sanitizedExpression,
        functions,
        parsedSheets,
        targetField.key.tableName
      );

      let updatedSheetContent = '';

      if (expressionMetadata && dslFieldNamePlacement) {
        const { end } = expressionMetadata;
        const start = fixedExpression
          ? expressionMetadata.start
          : dslFieldNamePlacement.end;

        updatedSheetContent =
          sheetContent.substring(0, start) +
          fixedExpression +
          sheetContent.substring(end + 1);
      } else {
        const { end } = targetField.dslFieldNamePlacement;
        updatedSheetContent =
          sheetContent.substring(0, end) +
          ` = ${fixedExpression}` +
          sheetContent.substring(end + 1);
      }

      const historyTitle = `Update expression of field [${fieldName}] in table "${tableName}"`;
      updateDSL(updatedSheetContent, historyTitle);
    },
    [parsedSheets, projectName, findContext, functions, updateDSL]
  );

  const editExpressionWithOverrideRemove = useCallback(
    (
      tableName: string,
      fieldName: string,
      expression: string,
      overrideIndex: number,
      overrideValue: OverrideValue
    ) => {
      const context = findContext(tableName, fieldName);

      if (!projectName || !context || !context.field) return;

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

      const { end, start, text } = targetField.expressionMetadata;
      const sanitizedExpression = sanitizeExpression(expression, text);
      const fixedExpression = autoFixSingleExpression(
        sanitizedExpression,
        functions,
        parsedSheets,
        targetField.key.tableName
      );

      const result = removeOverrideDSL(
        table,
        fieldName,
        overrideIndex,
        overrideValue,
        sheetContent
      );

      if (!result) return;

      if (result.tableRemoved) {
        const { updatedSheetContent, historyTitle } = result;
        updateDSL(updatedSheetContent, historyTitle);

        return;
      }

      const updatedSheetContent =
        result.updatedSheetContent.substring(0, start) +
        fixedExpression +
        result.updatedSheetContent.substring(end + 1);

      const historyTitle = `Update expression of field [${fieldName}] in table "${tableName}"`;
      updateDSL(updatedSheetContent, historyTitle);

      return true;
    },
    [parsedSheets, projectName, findContext, functions, updateDSL]
  );

  const renameFieldWithHeaderDisplay = useCallback(
    (tableName: string, oldName: string, newName: string) => {
      if (!projectName || !sheetContent) return;

      const targetTable = findTable(tableName);
      const targetField = findTableField(tableName, oldName);

      if (!targetTable || !targetField?.dslFieldNamePlacement) return;

      const { end, start } = targetField.dslFieldNamePlacement;

      const sanitizedNewName = escapeFieldName(newName);

      if (sanitizedNewName === oldName) return;

      const fields = targetTable.fields.map((field) => field.key.fieldName);
      const uniqueNewFieldName = createUniqueName(sanitizedNewName, fields);

      let updatedSheetContent = renameOverrideField(
        tableName,
        oldName,
        uniqueNewFieldName
      );

      updatedSheetContent = renameSortField(
        tableName,
        oldName,
        uniqueNewFieldName,
        updatedSheetContent || sheetContent
      );

      updatedSheetContent = renameFilterField(
        tableName,
        oldName,
        uniqueNewFieldName,
        updatedSheetContent || sheetContent
      );

      updatedSheetContent = renameTotalField(
        tableName,
        oldName,
        uniqueNewFieldName,
        updatedSheetContent || sheetContent
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

      const placementDecorator = targetTable.decorators.find(
        ({ decoratorName }) => decoratorName === placementDecoratorName
      );
      const hideFieldsHeaderDecorator = targetTable.decorators.find(
        ({ decoratorName }) => decoratorName === hideTableFieldsDecoratorName
      );

      if (!placementDecorator?.dslPlacement || !hideFieldsHeaderDecorator)
        return;

      const [placementStartRow, placementStartCol] = placementDecorator
        .params[0] as [number, number];
      const { start: placementStartOffset, end: placementEndOffset } =
        placementDecorator.dslPlacement;
      const newPlacementDecorator = getPlacementDecorator(
        targetTable.getIsTableDirectionHorizontal()
          ? placementStartCol - 1
          : placementStartCol,
        targetTable.getIsTableDirectionHorizontal()
          ? placementStartRow
          : placementStartRow - 1
      );

      if (hideFieldsHeaderDecorator?.dslPlacement) {
        const { start: hideHeaderStartOffset, end: hideHeaderEndOffset } =
          hideFieldsHeaderDecorator.dslPlacement;

        if (hideHeaderStartOffset < placementStartOffset) {
          updatedSheetContent =
            updatedSheetContent.substring(0, hideHeaderStartOffset) +
            updatedSheetContent.substring(
              hideHeaderEndOffset,
              placementStartOffset
            ) +
            newPlacementDecorator +
            newLine +
            updatedSheetContent.substring(placementEndOffset);
        } else {
          updatedSheetContent =
            updatedSheetContent.substring(0, placementStartOffset) +
            newPlacementDecorator +
            newLine +
            updatedSheetContent.substring(
              placementEndOffset,
              hideHeaderStartOffset
            ) +
            updatedSheetContent.substring(hideHeaderEndOffset);
        }
      }

      const historyTitle = `Rename field [${oldName}] to [${uniqueNewFieldName}] in table "${tableName}"`;
      updateDSL(updatedSheetContent, historyTitle);
    },
    [
      projectName,
      sheetContent,
      findTable,
      findTableField,
      renameOverrideField,
      renameSortField,
      renameFilterField,
      renameTotalField,
      updateDSL,
    ]
  );

  const renameTableWithHeaderDisplay = useCallback(
    (oldName: string, newName: string) => {
      if (!projectName || !sheetContent) return;

      if (oldName === newName) return;

      const targetTable = findTable(oldName);

      if (!targetTable?.dslTableNamePlacement) return;

      const { end, start } = targetTable.dslTableNamePlacement;

      const uniqueNewTableName = escapeTableName(
        createUniqueName(
          unescapeTableName(newName),
          getAllTableNames(projectSheets)
        )
      );

      let updatedSheetContent =
        sheetContent.substring(0, start) +
        uniqueNewTableName +
        sheetContent.substring(end);

      const placementDecorator = targetTable.decorators.find(
        ({ decoratorName }) => decoratorName === placementDecoratorName
      );
      const hideTableNameHeaderDecorator = targetTable.decorators.find(
        ({ decoratorName }) => decoratorName === hideTableHeaderDecoratorName
      );

      if (!placementDecorator?.dslPlacement || !hideTableNameHeaderDecorator)
        return;

      const [placementStartRow, placementStartCol] = placementDecorator
        .params[0] as [number, number];
      const { start: placementStartOffset, end: placementEndOffset } =
        placementDecorator.dslPlacement;
      const newPlacementDecorator = getPlacementDecorator(
        placementStartCol,
        placementStartRow - 1
      );

      if (hideTableNameHeaderDecorator.dslPlacement) {
        const { start: hideHeaderStartOffset, end: hideHeaderEndOffset } =
          hideTableNameHeaderDecorator.dslPlacement;

        if (hideHeaderStartOffset < placementStartOffset) {
          updatedSheetContent =
            updatedSheetContent.substring(0, hideHeaderStartOffset) +
            updatedSheetContent.substring(
              hideHeaderEndOffset,
              placementStartOffset
            ) +
            newPlacementDecorator +
            newLine +
            updatedSheetContent.substring(placementEndOffset);
        } else {
          updatedSheetContent =
            updatedSheetContent.substring(0, placementStartOffset) +
            newPlacementDecorator +
            newLine +
            updatedSheetContent.substring(
              placementEndOffset,
              hideHeaderStartOffset
            ) +
            updatedSheetContent.substring(hideHeaderEndOffset);
        }
      }

      const historyTitle = `Rename table "${oldName}" to "${uniqueNewTableName}"`;
      updateDSL(updatedSheetContent, historyTitle);
    },
    [projectName, sheetContent, findTable, projectSheets, updateDSL]
  );

  const deleteField = useCallback(
    (tableName: string, fieldName: string) => {
      const context = findContext(tableName, fieldName);

      if (!context || !projectName) return;

      const { table, sheetContent, sheetName, field } = context;

      if (!field) return;

      if (table.getFieldsCount() === 1) {
        deleteTable(tableName);

        return;
      }

      let targetField: ParsedField | undefined = field;

      if (field?.isDynamic) {
        targetField = table.fields.find(
          (f) => f.key.fieldName === dynamicFieldName
        );
      }

      if (!targetField?.dslPlacement) return;

      const { start, end } = targetField.dslPlacement;
      const targetTableName = targetField.key.fieldName;

      let updatedSheetContent = removeTotalByField(
        tableName,
        targetTableName,
        sheetContent
      );

      updatedSheetContent = removeFieldOverride(
        tableName,
        targetTableName,
        updatedSheetContent || sheetContent
      );

      updatedSheetContent = removeSortField(
        tableName,
        targetTableName,
        updatedSheetContent || sheetContent
      );

      updatedSheetContent = removeFilterField(
        tableName,
        targetTableName,
        updatedSheetContent || sheetContent
      );

      updatedSheetContent =
        updatedSheetContent.substring(0, start) +
        updatedSheetContent
          .substring(end + 1)
          .replace(newLine, '')
          .trimStart();

      const historyTitle = `Delete field [${fieldName}] from table "${tableName}"`;
      updateDSL(updatedSheetContent, historyTitle, sheetName);

      if (gridApi) {
        const selection = gridApi.selection;

        if (selection) {
          gridApi.updateSelectionAfterDataChanged({
            startCol: selection.startCol,
            endCol: selection.startCol,
            startRow: selection.startRow,
            endRow: selection.startRow,
          });
        }
      }
    },
    [
      findContext,
      projectName,
      removeTotalByField,
      removeSortField,
      removeFilterField,
      removeFieldOverride,
      updateDSL,
      gridApi,
      deleteTable,
    ]
  );

  const deleteSelectedFieldOrTable = useCallback(() => {
    if (!gridApi || !sheetContent || gridApi?.isCellEditorOpen()) return;

    const selection = gridApi.getSelection();
    if (!selection) return;

    const { startCol, endCol, startRow, endRow } = selection;

    const tableStructure = viewGridData.getGridTableStructure();
    const tableMetas = findTablesInSelection(tableStructure, selection);
    if (!tableMetas.length) return;

    const tableNamesToDelete: string[] = [];
    tableMetas.forEach((tableMeta) => {
      const { tableName } = tableMeta;
      const startRowCell = gridApi.getCell(startCol, startRow);
      const endRowCell = gridApi.getCell(startCol, endRow);

      const tableHeaderRowSelected =
        startRowCell?.isTableHeader || endRowCell?.isTableHeader;
      const entireTableHeaderSelected =
        startCol === tableMeta.startCol && endCol === tableMeta.endCol;
      const entireTableSelected = isTableInsideSelection(tableMeta, selection);
      if (
        (tableHeaderRowSelected && entireTableHeaderSelected) ||
        entireTableSelected
      ) {
        tableNamesToDelete.push(tableName);

        return;
      }

      const table = findTable(tableName);
      if (!table) return;

      const fieldNames = new Array(Math.abs(startCol - endCol) + 1)
        .fill(0)
        .map((_, index) =>
          gridApi.getCell(Math.min(startCol, endCol) + index, startRow)
        )
        .filter((c) => c?.table?.tableName === tableName)
        .map((cell) => cell?.field?.fieldName)
        .filter(Boolean);
      const uniqueFields = Array.from(new Set(fieldNames))
        .map((fieldName) => findTableField(tableName, fieldName as string))
        .filter(Boolean);

      if (uniqueFields.length !== 1) {
        return;
      }

      let field = uniqueFields[0];
      if (!field) return;

      if (field.isDynamic) {
        field = findTableField(tableName, dynamicFieldName);

        if (!field) return;
      }

      const { fieldName } = field.key;
      const startCell = gridApi.getCell(startCol, startRow);
      const endCell = gridApi.getCell(startCol, endRow);

      if (startCell?.totalIndex) {
        removeTotalByIndex(tableName, fieldName, startCell.totalIndex);

        return;
      }

      if (startCell?.isFieldHeader || endCell?.isFieldHeader) {
        deleteField(tableName, fieldName);
      } else {
        if (
          !startCell ||
          startCell.overrideIndex === undefined ||
          startCell.value === undefined
        )
          return;

        const currentCellFieldName = uniqueFields[0]?.key.fieldName;

        removeOverride(
          tableName,
          currentCellFieldName ?? fieldName,
          startCell.overrideIndex,
          startCell.value
        );
      }
    });

    if (tableNamesToDelete.length > 1) {
      deleteTables(tableNamesToDelete);
    } else if (tableNamesToDelete.length === 1) {
      deleteTable(tableNamesToDelete[0]);
    }
  }, [
    deleteField,
    deleteTable,
    deleteTables,
    findTable,
    findTableField,
    gridApi,
    removeOverride,
    removeTotalByIndex,
    sheetContent,
    viewGridData,
  ]);

  const onRemoveRow = useCallback(
    (tableName: string, overrideIndex: number) => {
      if (!projectName) return;

      const table = findTable(tableName);

      if (!table || !table.isManual() || !sheetContent) return;

      const { overrides } = table;

      if (!overrides || !overrides.overrideRows) return;

      if (overrides.overrideRows.length > 1) {
        removeOverrideRow(tableName, overrideIndex);

        return;
      } else {
        deleteTable(tableName);
      }
    },
    [deleteTable, findTable, projectName, removeOverrideRow, sheetContent]
  );

  const onCloneTable = useCallback(
    (tableName: string, options: { col?: number; row?: number } = {}) => {
      if (!projectName) return;

      const sourceParsedSheet = Object.entries(parsedSheets).find(
        ([sheetName, sheet]) =>
          !!sheet.tables.find((table) => table.tableName === tableName)
      );
      const sourceProjectSheetContent = projectSheets?.find(
        (sheet) => sheet.sheetName === sourceParsedSheet?.[0]
      )?.content;
      const sourceTable = sourceParsedSheet?.[1]?.tables.find(
        (table) => table.tableName === tableName
      );
      if (!sourceTable || !sourceProjectSheetContent || !sheetName) return;

      const tableDSLPlacement = sourceTable.dslPlacement;
      const tableNameDSLPlacement = sourceTable.dslTableNamePlacement;
      const placementDecorator = sourceTable.decorators.find(
        (dec) => dec.decoratorName === placementDecoratorName
      );
      const placementDecoratorDSLPlacement = placementDecorator?.dslPlacement;
      if (!tableDSLPlacement || !placementDecorator?.dslPlacement) return;

      const tableBeforePlacementDSL = sourceProjectSheetContent.slice(
        tableDSLPlacement?.startOffset,
        placementDecoratorDSLPlacement?.start
      );
      const tableBeforeNameDSL = sourceProjectSheetContent.slice(
        placementDecoratorDSLPlacement?.end,
        tableNameDSLPlacement?.start
      );
      const tableAfterNameDSL = sourceProjectSheetContent.slice(
        tableNameDSLPlacement?.end,
        tableDSLPlacement?.stopOffset + 1
      );
      const uniqueNewTableName = escapeTableName(
        createUniqueName(
          unescapeTableName(tableName + ' clone'),
          getAllTableNames(projectSheets)
        )
      );

      let newTableCol = options.col;
      let newTableRow = options.row;
      if (!newTableCol || !newTableRow) {
        newTableCol = (placementDecorator.params[0][1] ?? 1) + 1;
        newTableRow = (placementDecorator.params[0][0] ?? 1) + 1;
      }

      const newTableDSL =
        newLine +
        newLine +
        tableBeforePlacementDSL +
        getPlacementDecorator(newTableCol!, newTableRow!) +
        newLine +
        tableBeforeNameDSL +
        uniqueNewTableName +
        tableAfterNameDSL +
        newLine;

      const updatedSheetContent =
        stripNewLinesAtEnd(sheetContent ?? '') + newTableDSL;

      const historyTitle = `Cloned table "${tableName}" with new name "${uniqueNewTableName}"`;
      updateDSL(updatedSheetContent, historyTitle, sheetName);
    },
    [
      parsedSheets,
      projectName,
      projectSheets,
      sheetContent,
      sheetName,
      updateDSL,
    ]
  );

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

      const historyTitle = `Swap fields [${rightFieldName}] and [${leftFieldName}] in table "${tableName}"`;
      updateDSL(updatedSheetContent, historyTitle, sheetName);
    },
    [
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

  const handleChangeColumnSize = useCallback(
    (tableName: string, fieldName: string, valueAdd: number) => {
      const isIncrease = valueAdd > 0;
      const targetTable = findTable(tableName);
      if (!projectName || !sheetContent || !targetTable) return;

      const fieldIndex = targetTable.fields.findIndex(
        (field) => field.key.fieldName === fieldName
      );
      const field = targetTable.fields[fieldIndex];

      if (!field) {
        return;
      }
      const newValue = field.getSize() + valueAdd;

      if (newValue <= 0 || !valueAdd) {
        return;
      }

      const { sizesDecoratorPlacement, fieldSizesSheetContent } =
        updateFieldSize({
          newValue,
          targetField: field,
        });

      const updatedSheetContent =
        sheetContent.substring(0, sizesDecoratorPlacement.start) +
        fieldSizesSheetContent +
        sheetContent.substring(sizesDecoratorPlacement.end);

      const historyTitle = `${
        isIncrease ? 'Increase' : 'Decrease'
      } [${fieldName}] column width in table "${tableName}"`;
      updateDSL(updatedSheetContent, historyTitle);

      if (!gridApi) {
        return;
      }

      const selection = gridApi.selection;
      if (!selection) return;

      gridApi.updateSelectionAfterDataChanged({
        startCol: selection.startCol,
        startRow: selection.startRow,
        endCol: selection.startCol,
        endRow: selection.startRow,
      });
    },
    [findTable, gridApi, projectName, sheetContent, updateDSL, updateFieldSize]
  );

  const onToggleTableHeaderVisibility = useCallback(
    (tableName: string) => {
      const targetTable = findTable(tableName);
      const tableDSLPlacement = targetTable?.dslPlacement;
      if (!projectName || !sheetContent || !targetTable || !tableDSLPlacement)
        return;

      const hideDecorator = targetTable.decorators.find(
        (decorator) => decorator.decoratorName === hideTableHeaderDecoratorName
      );

      let updatedSheetContent;

      if (hideDecorator?.dslPlacement) {
        updatedSheetContent =
          sheetContent.substring(0, hideDecorator.dslPlacement.start) +
          sheetContent.substring(hideDecorator.dslPlacement.end);
      } else {
        updatedSheetContent =
          sheetContent.substring(0, tableDSLPlacement.startOffset) +
          hideTableHeaderDecorator +
          newLine +
          sheetContent.substring(tableDSLPlacement.startOffset);
      }

      const historyTitleStart = hideDecorator ? 'Show' : 'Hide';
      const historyTitle = `${historyTitleStart} header of table "${tableName}"`;
      updateDSL(updatedSheetContent, historyTitle);

      if (!gridApi) {
        return;
      }

      const selection = gridApi.selection;
      if (!selection) return;

      gridApi.updateSelectionAfterDataChanged({
        startCol: selection.startCol,
        startRow: selection.startRow,
        endCol: selection.startCol,
        endRow: selection.startRow,
      });
    },
    [findTable, gridApi, projectName, sheetContent, updateDSL]
  );

  const onFlipTable = useCallback(
    (tableName: string) => {
      const targetTable = findTable(tableName);
      const tableDSLPlacement = targetTable?.dslPlacement;
      if (!projectName || !sheetContent || !targetTable || !tableDSLPlacement)
        return;

      const decorator = targetTable.decorators.find(
        (decorator) =>
          decorator.decoratorName === horizontalDirectionDecoratorName
      );

      let updatedSheetContent;

      if (decorator?.dslPlacement) {
        updatedSheetContent =
          sheetContent.substring(0, decorator.dslPlacement.start) +
          sheetContent.substring(decorator.dslPlacement.end);
      } else {
        updatedSheetContent =
          sheetContent.substring(0, tableDSLPlacement.startOffset) +
          horizontalDirectionDecorator +
          newLine +
          sheetContent.substring(tableDSLPlacement.startOffset);
      }

      const historyTitle = decorator
        ? `Make table "${tableName}" vertical`
        : `Make table "${tableName}" horizontal`;
      updateDSL(updatedSheetContent, historyTitle);

      if (!gridApi) {
        return;
      }

      const selection = gridApi.selection;
      if (!selection) return;

      gridApi.updateSelectionAfterDataChanged({
        startCol: selection.startCol,
        startRow: selection.startRow,
        endCol: selection.startCol,
        endRow: selection.startRow,
      });
    },
    [findTable, gridApi, projectName, sheetContent, updateDSL]
  );

  const onToggleTableFieldsVisibility = useCallback(
    (tableName: string) => {
      const targetTable = findTable(tableName);
      const tableDSLPlacement = targetTable?.dslPlacement;
      if (!projectName || !sheetContent || !targetTable || !tableDSLPlacement)
        return;

      const hideDecorator = targetTable.decorators.find(
        (decorator) => decorator.decoratorName === hideTableFieldsDecoratorName
      );

      let updatedSheetContent;

      if (hideDecorator?.dslPlacement) {
        updatedSheetContent =
          sheetContent.substring(0, hideDecorator.dslPlacement.start) +
          sheetContent.substring(hideDecorator.dslPlacement.end);
      } else {
        updatedSheetContent =
          sheetContent.substring(0, tableDSLPlacement.startOffset) +
          hideTableFieldsDecorator +
          newLine +
          sheetContent.substring(tableDSLPlacement.startOffset);
      }

      const historyTitleStart = hideDecorator ? 'Show' : 'Hide';
      const historyTitle = `${historyTitleStart} fields of table "${tableName}"`;
      updateDSL(updatedSheetContent, historyTitle);

      if (!gridApi) {
        return;
      }

      const selection = gridApi.selection;
      if (!selection) return;

      gridApi.updateSelectionAfterDataChanged({
        startCol: selection.startCol,
        startRow: selection.startRow,
        endCol: selection.startCol,
        endRow: selection.startRow,
      });
    },
    [findTable, gridApi, projectName, sheetContent, updateDSL]
  );

  const onIncreaseFieldColumnSize = useCallback(
    (tableName: string, fieldName: string) => {
      handleChangeColumnSize(tableName, fieldName, 1);
    },
    [handleChangeColumnSize]
  );
  const onDecreaseFieldColumnSize = useCallback(
    (tableName: string, fieldName: string) => {
      handleChangeColumnSize(tableName, fieldName, -1);
    },
    [handleChangeColumnSize]
  );

  const addField = useCallback(
    (
      tableName: string,
      fieldText: string,
      insertOptions: {
        direction?: HorizontalDirection;
        insertFromFieldName?: string;
        withSelection?: boolean;
      } = {}
    ) => {
      const targetTable = findTable(tableName);
      const { direction, insertFromFieldName, withSelection } = insertOptions;

      let targetField = findLastTableField(tableName);

      if (direction === 'left' && insertFromFieldName) {
        targetField = findFieldOnLeftOrRight(
          tableName,
          insertFromFieldName,
          'left'
        );
      }

      if (direction === 'right' && insertFromFieldName) {
        targetField = findTableField(tableName, insertFromFieldName);
      }

      if (targetField?.isDynamic) {
        targetField = findTableField(tableName, dynamicFieldName);
      }

      if (!targetTable || !sheetContent || !projectName) return;

      const { updatedSheetContent, fieldName } = addFieldToSheet({
        targetTable,
        targetField,
        sheetContent,
        fieldText,
        functions,
        parsedSheets,
      });

      if (!updatedSheetContent) return;

      const historyTitle = `Add [${fieldName}] to table "${targetTable.tableName}"`;
      updateDSL(updatedSheetContent, historyTitle);

      if (withSelection) {
        setTimeout(() => {
          if (!selectedCell) return;

          const { col, row } = selectedCell;
          const cell = gridApi?.getCell(col, row);
          if (!cell) return;

          const { table } = cell;
          if (!table) return;

          const { isTableHorizontal, isTableNameHeaderHidden } = table;

          let fieldCell;
          if (isTableHorizontal) {
            let currentRow;
            const startRow = table.startRow + (isTableNameHeaderHidden ? 0 : 1);

            for (
              currentRow = startRow;
              currentRow <= table.endRow;
              currentRow++
            ) {
              fieldCell = gridApi?.getCell(table.startCol, currentRow);

              if (fieldCell?.field?.fieldName === fieldName) {
                break;
              }

              fieldCell = undefined;
            }
          } else {
            let currentCol;
            const startCol = table.startCol;
            const startRow = table.startRow + (isTableNameHeaderHidden ? 0 : 1);

            for (
              currentCol = startCol;
              currentCol <= table.endCol;
              currentCol++
            ) {
              fieldCell = gridApi?.getCell(currentCol, startRow);

              if (fieldCell?.field?.fieldName === fieldName) {
                break;
              }

              fieldCell = undefined;
            }
          }

          if (fieldCell) {
            gridApi?.updateSelection({
              startCol: fieldCell.col,
              startRow: fieldCell.row,
              endCol: fieldCell.col,
              endRow: fieldCell.row,
            });
            gridApi?.showCellEditor(fieldCell.col, fieldCell.row, '=', {
              dimFieldName: fieldName,
              withFocus: true,
            });
          }
        }, 500);
      }
    },
    [
      findTable,
      findLastTableField,
      sheetContent,
      projectName,
      functions,
      parsedSheets,
      updateDSL,
      findFieldOnLeftOrRight,
      findTableField,
      selectedCell,
      gridApi,
    ]
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

      const historyTitle = `Remove dimension [${fieldName}] from table "${tableName}"`;
      updateDSL(updatedSheetContent, historyTitle, sheetName);
    },
    [findContext, projectName, updateDSL]
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
        `${dimKeyword} ` +
        sheetContent.substring(start).trimStart();

      const historyTitle = `Add dimension [${fieldName}] to table "${tableName}"`;
      updateDSL(updatedSheetContent, historyTitle, sheetName);
    },
    [findContext, projectName, updateDSL]
  );

  const addKey = useCallback(
    (tableName: string, fieldName: string) => {
      const context = findContext(tableName, fieldName);

      if (!context || !projectName) return;

      const { sheetContent, sheetName, field } = context;

      if (!sheetContent || !field?.dslFieldNamePlacement || field.isKey) return;

      const start =
        field.isDim && field.dslDimensionPlacement
          ? field.dslDimensionPlacement.start
          : field.dslFieldNamePlacement.start;

      const updatedSheetContent =
        sheetContent.substring(0, start) +
        `${keyKeyword} ` +
        sheetContent.substring(start).trimStart();

      const historyTitle = `Add key [${fieldName}] to table "${tableName}"`;
      updateDSL(updatedSheetContent, historyTitle, sheetName);
    },
    [findContext, projectName, updateDSL]
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

      const historyTitle = `Remove key [${fieldName}] from table "${tableName}"`;
      updateDSL(updatedSheetContent, historyTitle, sheetName);
    },
    [findContext, projectName, updateDSL]
  );

  const addFieldWithOverride = useCallback(
    ({
      tableName,
      fieldText,
      overrideCol,
      overrideRow,
      overrideValue,
    }: {
      tableName: string;
      fieldText: string;
      overrideCol: number;
      overrideRow: number;
      overrideValue: string;
    }) => {
      const table = findTable(tableName);
      const targetField = findLastTableField(tableName);

      if (!projectName || !sheetContent || !table || !targetField) return;

      const addFieldResult = addFieldToSheet({
        targetTable: table,
        targetField,
        sheetContent,
        fieldText,
        functions,
        parsedSheets,
      });

      table.fields.push(
        new ParsedField(
          false,
          false,
          false,
          {
            fieldName: addFieldResult.fieldName,
            fullFieldName: addFieldResult.fieldName,
            tableName: table.tableName,
          },
          naExpression,
          undefined,
          addFieldResult.fieldDslPlacement
        )
      );
      if (table.dslPlacement && addFieldResult.updatedSheetContent) {
        table.dslPlacement.stopOffset =
          table.dslPlacement.stopOffset +
          addFieldResult.updatedSheetContent.length -
          sheetContent.length;
      }
      if (table.dslOverridePlacement && addFieldResult.updatedSheetContent) {
        table.dslOverridePlacement.stopOffset =
          table.dslOverridePlacement.stopOffset +
          addFieldResult.updatedSheetContent.length -
          sheetContent.length;
        table.dslOverridePlacement.startOffset =
          table.dslOverridePlacement.startOffset +
          addFieldResult.updatedSheetContent.length -
          sheetContent.length;
      }

      const updatedSheetContent = addOverridesToSheet({
        table,
        cells: [[overrideValue]],
        gridApi,
        selectedCol: overrideCol,
        selectedRow: overrideRow,
        sheetContent: addFieldResult.updatedSheetContent,
      });

      if (!updatedSheetContent) {
        return;
      }

      const historyTitle = `Add new field "${addFieldResult.fieldName}" with override "${overrideValue}" to table "${tableName}"`;
      updateDSL(updatedSheetContent, historyTitle);
    },
    [
      findLastTableField,
      findTable,
      functions,
      gridApi,
      parsedSheets,
      projectName,
      sheetContent,
      updateDSL,
    ]
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

      if (sizeDecorator?.dslPlacement) {
        const { start, end } = sizeDecorator.dslPlacement;
        const currentSize = sizeDecorator.params[0] as [number, number];

        if (currentSize[0] === rows && currentSize[1] === cols) return;

        updatedSheetContent =
          sheetContent.substring(0, start) +
          `!size(${rows}, ${cols})` +
          newLine +
          sheetContent.substring(end).trimStart();
      } else {
        if (!table.dslTableNamePlacement) return;
        updatedSheetContent =
          sheetContent.substring(
            0,
            table.dslTableNamePlacement.start - tableKeywordLength
          ) +
          `!size(${rows}, ${cols})${newLine}${tableKeyword} ` +
          sheetContent.substring(table.dslTableNamePlacement.start);
      }

      const historyTitle = `Resize chart [${tableName}] to (${rows}, ${cols})`;
      updateDSL(updatedSheetContent, historyTitle, sheetName);
    },
    [findContext, projectName, updateDSL]
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
        .map((d) => `!${d.decoratorName}(${d.params.join(',')})${newLine}`);

      const chartTable =
        'table ' + chartTableName + sheetContent.substring(end, stopOffset + 1);

      const updatedSheetContent =
        sheetContent +
        `${newLine}${newLine}!visualization("line-chart")${newLine}` +
        `!placement(${row},${newCol})${newLine}` +
        decorators +
        chartTable;

      const historyTitle = `Add chart "${chartTableName}"`;
      updateDSL(updatedSheetContent, historyTitle, sheetName);
    },
    [findContext, projectName, projectSheets, updateDSL]
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
        `!visualization("line-chart")${newLine}${tableKeyword} ` +
        sheetContent.substring(start);

      const historyTitle = `Convert table "${tableName}" to chart`;
      updateDSL(updatedSheetContent, historyTitle, sheetName);
    },
    [projectName, updateDSL, findContext]
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
        .map((d) => `!${d.decoratorName}(${d.params.join(',')})${newLine}`);

      const updatedSheetContent =
        sheetContent.substring(0, startOffset) +
        decorators +
        'table ' +
        sheetContent.substring(start);

      const historyTitle = `Convert chart "${tableName}" to table`;
      updateDSL(updatedSheetContent, historyTitle, sheetName);
    },
    [projectName, updateDSL, findContext]
  );

  const removeNote = useCallback(
    (tableName: string, fieldName: string) => {
      const context = findContext(tableName);

      if (!context || !projectName) return;

      const { sheetContent, sheetName } = context;

      const targetField = findTableField(tableName, fieldName);

      if (!targetField || !targetField.note) return;

      const { start, end } = targetField.note;

      const updatedSheetContent =
        sheetContent.substring(0, start) +
        sheetContent.substring(end + 1).replace(/^(\r\n|\r|\n)/, '');

      const historyTitle = `Remove note from ${tableName}[${fieldName}]`;
      updateDSL(updatedSheetContent, historyTitle, sheetName);
    },
    [findContext, findTableField, projectName, updateDSL]
  );

  const updateNote = useCallback(
    (tableName: string, fieldName: string, note: string) => {
      const context = findContext(tableName);

      if (!context || !projectName) return;

      const { sheetContent, sheetName } = context;

      const targetField = findTableField(tableName, fieldName);

      if (!targetField) return;

      let updatedSheetContent = sheetContent;
      const dslComment = noteToComment(note);

      if (targetField.note) {
        const { start, end } = targetField.note;

        updatedSheetContent =
          sheetContent.substring(0, start) +
          dslComment +
          newLine +
          sheetContent.substring(end + 1);
      } else if (targetField.dslPlacement) {
        const { start } = targetField.dslPlacement;

        updatedSheetContent =
          sheetContent.substring(0, start).trimEnd() +
          `${newLine}${dslComment}${newLine}` +
          sheetContent.substring(start);
      }

      const historyTitle = `Update note for ${tableName}[${fieldName}]`;
      updateDSL(updatedSheetContent, historyTitle, sheetName);
    },
    [findContext, findTableField, projectName, updateDSL]
  );

  return {
    addChart,
    addDimension,
    addField,
    addKey,
    chartResize,
    convertToChart,
    convertToTable,
    deleteField,
    deleteSelectedFieldOrTable,
    editExpression,
    editExpressionWithOverrideRemove,
    moveTable,
    moveTableTo,
    onCloneTable,
    removeNote,
    removeDimension,
    removeKey,
    renameField,
    renameTable,
    updateNote,
    swapFields,
    swapFieldsHandler,
    onIncreaseFieldColumnSize,
    onDecreaseFieldColumnSize,
    onChangeFieldColumnSize: handleChangeColumnSize,
    addFieldWithOverride,
    onToggleTableHeaderVisibility,
    onToggleTableFieldsVisibility,
    onFlipTable,
    renameFieldWithHeaderDisplay,
    renameTableWithHeaderDisplay,
    onRemoveRow,
  };
}
