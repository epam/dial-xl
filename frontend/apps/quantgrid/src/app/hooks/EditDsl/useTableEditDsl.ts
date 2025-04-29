import { useCallback, useContext } from 'react';

import { HorizontalDirection } from '@frontend/canvas-spreadsheet';
import { ChartType, TableArrangeType } from '@frontend/common';
import {
  collectTableNames,
  dynamicFieldName,
  escapeTableName,
  getLayoutParams,
  Sheet,
  unescapeFieldName,
  unescapeTableName,
  visualizationDecoratorName,
} from '@frontend/parser';

import { ProjectContext, ViewportContext } from '../../context';
import { createUniqueName, findNearestOverlappingTable } from '../../services';
import { UpdateDslParams, useDSLUtils } from '../ManualEditDSL';
import { useSafeCallback } from '../useSafeCallback';
import { useSpreadsheetSelection } from '../useSpreadsheetSelection';
import {
  editLayoutDecorator,
  EditLayoutDecoratorProps,
  editTableDecorator,
} from './utils';

export function useTableEditDsl() {
  const { viewGridData } = useContext(ViewportContext);
  const { parsedSheets } = useContext(ProjectContext);
  const {
    updateDSL,
    findEditContext,
    findContext,
    findFieldOnLeftOrRight,
    findTableField,
  } = useDSLUtils();
  const { updateSelectionAfterDataChanged } = useSpreadsheetSelection();

  const renameTable = useCallback(
    (
      oldName: string,
      newName: string,
      params?: { showHeader: boolean }
    ): string | undefined => {
      const context = findEditContext(oldName);
      if (!context) return;

      const { sheet, table, parsedTable } = context;
      const uniqueNewTableName = escapeTableName(
        createUniqueName(
          unescapeTableName(newName),
          collectTableNames(parsedSheets)
        )
      );

      table.name = uniqueNewTableName;

      if (params?.showHeader && parsedTable.getIsTableHeaderHidden()) {
        editLayoutDecorator(table, parsedTable, {
          showTableHeader: true,
          rowOffset: -1,
        });
      }

      const historyTitle = `Rename table "${oldName}" to "${uniqueNewTableName}"`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        tableName: uniqueNewTableName,
        historyTitle,
      });

      return uniqueNewTableName;
    },
    [findEditContext, parsedSheets, updateDSL]
  );

  const toggleTableTitleOrHeaderVisibility = useCallback(
    (tableName: string, toggleTableHeader: boolean) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheet, table, parsedTable } = context;
      const isHeaderHidden = parsedTable.getIsTableHeaderHidden();
      const isTableFieldsHidden = parsedTable.getIsTableFieldsHidden();
      const props: EditLayoutDecoratorProps = {};
      if (toggleTableHeader) {
        props.showTableHeader = isHeaderHidden;
      } else {
        props.showFieldHeaders = isTableFieldsHidden;
      }

      const success = editLayoutDecorator(table, parsedTable, props);
      if (!success) return;

      const historyTitleStart =
        (toggleTableHeader && isHeaderHidden) ||
        (!toggleTableHeader && isTableFieldsHidden)
          ? 'Show'
          : 'Hide';
      const historyEntity = toggleTableHeader ? 'header' : 'fields';
      const historyTitle = `${historyTitleStart} ${historyEntity} of table "${tableName}"`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
      updateSelectionAfterDataChanged();
    },
    [findEditContext, updateSelectionAfterDataChanged, updateDSL]
  );

  const handleMoveTable = useCallback(
    (
      tableName: string,
      rowValue: number,
      colValue: number,
      isDelta: boolean
    ) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheet, table, parsedTable } = context;
      const layoutDecorator = parsedTable.getLayoutDecorator();
      let targetRow = 1;
      let targetCol = 1;

      if (layoutDecorator) {
        const [startRow, startCol] = layoutDecorator.params[0] as [
          number,
          number
        ];

        if (isDelta) {
          if (rowValue === 0 && colValue === 0) return;
          targetRow = startRow + rowValue;
          targetCol = startCol + colValue;
        } else {
          if (rowValue === startRow && colValue === startCol) return;
          targetRow = rowValue;
          targetCol = colValue;
        }
      } else {
        if (isDelta) {
          targetRow = 1 + rowValue;
          targetCol = 1 + colValue;
        } else {
          targetRow = rowValue;
          targetCol = colValue;
        }
      }

      editLayoutDecorator(table, parsedTable, { targetRow, targetCol });

      const historyTitle = `Move table "${tableName}" to (${targetRow}, ${targetCol})`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  const moveTable = useCallback(
    (tableName: string, rowDelta: number, colDelta: number) => {
      handleMoveTable(tableName, rowDelta, colDelta, true);
    },
    [handleMoveTable]
  );

  const moveTableTo = useCallback(
    (tableName: string, row: number, col: number) => {
      handleMoveTable(tableName, row, col, false);
    },
    [handleMoveTable]
  );

  const flipTable = useCallback(
    (tableName: string) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheet, table, parsedTable } = context;
      const decorator = parsedTable.getLayoutDecorator();
      const layoutDecoratorParams = decorator
        ? getLayoutParams(decorator)
        : undefined;
      const isHorizontal = layoutDecoratorParams?.isHorizontal;

      const success = editLayoutDecorator(table, parsedTable, {
        isHorizontal: !isHorizontal,
      });

      if (!success) return;

      const historyTitle = `Make table "${tableName}" ${
        isHorizontal ? 'vertical' : 'horizontal'
      }`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });

      updateSelectionAfterDataChanged();
    },
    [findEditContext, updateDSL, updateSelectionAfterDataChanged]
  );

  const convertToChart = useCallback(
    (tableName: string, chartType: ChartType) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheetName, sheet, table } = context;
      const decoratorArgs = `("${chartType}")`;
      const success = editTableDecorator(
        table,
        visualizationDecoratorName,
        decoratorArgs,
        true
      );

      if (!success) return;

      const historyTitle = `Convert table "${tableName}" to chart`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        sheetNameToChange: sheetName,
        historyTitle,
      });
    },
    [findEditContext, updateDSL]
  );

  const convertToTable = useCallback(
    (tableName: string) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheetName, sheet, table } = context;
      const success = editTableDecorator(
        table,
        visualizationDecoratorName,
        '',
        true
      );

      if (!success) return;

      const historyTitle = `Convert chart "${tableName}" to table`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        sheetNameToChange: sheetName,
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  const updateTableDecoratorValue = useCallback(
    (
      tableName: string,
      value: string | string[],
      decoratorName: string,
      customHistoryMessage?: string
    ) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheetName, sheet, table } = context;
      const decoratorArgs = Array.isArray(value)
        ? `(${value.join(',')})`
        : `(${value})`;
      const success = editTableDecorator(table, decoratorName, decoratorArgs);

      if (!success) return;

      const historyTitle = customHistoryMessage
        ? customHistoryMessage
        : `Update "${decoratorName}" value for table "${tableName}"`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        sheetNameToChange: sheetName,
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  const swapFields = useCallback(
    (
      tableName: string,
      rightFieldName: string,
      leftFieldName: string,
      direction: HorizontalDirection
    ) => {
      const rfContext = findEditContext(tableName, rightFieldName);
      const lfContext = findEditContext(tableName, leftFieldName);

      if (!rfContext || !lfContext) return;

      const { sheetName, sheet, table } = rfContext;
      let rightField = rfContext.parsedField || null;
      let leftField = lfContext.parsedField || null;

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

      if (!rightField || !leftField) return;

      const rFieldName = unescapeFieldName(rightField.key.fieldName);
      const lFieldName = unescapeFieldName(leftField.key.fieldName);
      table.swapFields(rFieldName, lFieldName);

      const historyTitle = `Swap fields [${rightFieldName}] and [${leftFieldName}] in table "${tableName}"`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        sheetNameToChange: sheetName,
        tableName,
      });
    },
    [findEditContext, findFieldOnLeftOrRight, findTableField, updateDSL]
  );

  const swapFieldsByDirection = useCallback(
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

  const deleteTables = useCallback(
    (tableNames: string[]) => {
      const sheetsToUpdate: Record<
        string,
        { sheet: Sheet; tableNames: string[] }
      > = {};

      for (const parsedSheet of Object.keys(parsedSheets)) {
        const { tables, editableSheet } = parsedSheets[parsedSheet];
        const tablesToDelete = tables
          .filter((t) => tableNames.includes(t.tableName))
          .map((t) => t.tableName);

        if (!tablesToDelete.length || !editableSheet) continue;

        sheetsToUpdate[parsedSheet] = {
          sheet: editableSheet,
          tableNames: tablesToDelete,
        };
      }

      const dslChanges: UpdateDslParams[] = [];

      for (const sheetName of Object.keys(sheetsToUpdate)) {
        const { sheet, tableNames } = sheetsToUpdate[sheetName];

        for (const tableName of tableNames) {
          sheet.removeTable(unescapeTableName(tableName));
        }
        const historyTitle = `Delete table${
          tableNames.length > 1 ? 's' : ''
        } ${tableNames.map((tableName) => `"${tableName}"`).join(', ')}`;

        dslChanges.push({
          updatedSheetContent: sheet.toDSL(),
          historyTitle,
          sheetNameToChange: sheetName,
        });
      }

      updateDSL(dslChanges);
    },
    [updateDSL, parsedSheets]
  );

  const deleteTable = useCallback(
    (tableName: string) => {
      deleteTables([tableName]);
    },
    [deleteTables]
  );

  const arrangeTable = useCallback(
    (tableName: string, arrangeType: TableArrangeType) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheet, parsedSheet, parsedTable } = context;

      const tableStructures = viewGridData.getGridTableStructure();
      const unescapedTableName = unescapeTableName(tableName);

      if (arrangeType === 'back') {
        sheet.moveTableToIndex(unescapedTableName, 0);
      }

      if (arrangeType === 'front') {
        sheet.moveTableToIndex(unescapedTableName, sheet.tables.length - 1);
      }

      if (arrangeType === 'forward' || arrangeType === 'backward') {
        const isForward = arrangeType === 'forward';
        const targetGridTable = tableStructures.find(
          (table) => table.tableName === tableName
        );

        if (!targetGridTable || !parsedSheet?.tables) return;

        const overlappingTable = findNearestOverlappingTable(
          targetGridTable,
          parsedTable,
          tableStructures,
          parsedSheet.tables,
          isForward
        );

        if (!overlappingTable) return;

        const overlappingTableIndex = sheet.findTableIndex(
          unescapeTableName(overlappingTable.tableName)
        );

        if (isForward) {
          sheet.moveTableToIndex(unescapedTableName, overlappingTableIndex);
        } else {
          sheet.moveTableToIndex(
            unescapedTableName,
            Math.max(0, overlappingTableIndex - 1)
          );
        }
      }

      const historyTitle = `Table "${tableName}" moved ${arrangeType}`;
      updateDSL({ updatedSheetContent: sheet.toDSL(), historyTitle });
    },
    [findEditContext, updateDSL, viewGridData]
  );

  return {
    arrangeTable: useSafeCallback(arrangeTable),
    convertToChart: useSafeCallback(convertToChart),
    convertToTable: useSafeCallback(convertToTable),
    deleteTable: useSafeCallback(deleteTable),
    deleteTables: useSafeCallback(deleteTables),
    flipTable: useSafeCallback(flipTable),
    moveTable: useSafeCallback(moveTable),
    moveTableTo: useSafeCallback(moveTableTo),
    renameTable: useSafeCallback(renameTable),
    swapFields: useSafeCallback(swapFields),
    swapFieldsByDirection: useSafeCallback(swapFieldsByDirection),
    toggleTableTitleOrHeaderVisibility: useSafeCallback(
      toggleTableTitleOrHeaderVisibility
    ),
    updateTableDecoratorValue: useSafeCallback(updateTableDecoratorValue),
  };
}
