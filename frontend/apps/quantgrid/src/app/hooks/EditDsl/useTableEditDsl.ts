import { useCallback, useContext } from 'react';

import { HorizontalDirection } from '@frontend/canvas-spreadsheet';
import { TableArrangeType } from '@frontend/common';
import {
  collectTableNames,
  dynamicFieldName,
  escapeTableName,
  FieldsReferenceExpression,
  getLayoutParams,
  Sheet,
  SheetReader,
  unescapeFieldName,
  unescapeTableName,
  visualizationDecoratorName,
} from '@frontend/parser';

import { ProjectContext, ViewportContext } from '../../context';
import { createUniqueName, findNearestOverlappingTable } from '../../services';
import { useSafeCallback } from '../useSafeCallback';
import { useSpreadsheetSelection } from '../useSpreadsheetSelection';
import { UpdateDslParams, useDSLUtils } from './useDSLUtils';
import {
  editLayoutDecorator,
  EditLayoutDecoratorProps,
  editTableDecorator,
} from './utils';

export function useTableEditDsl() {
  const { viewGridData } = useContext(ViewportContext);
  const { parsedSheets, sheetName } = useContext(ProjectContext);
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

      const { sheetName, sheet, table, parsedTable } = rfContext;
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

      // Swap fields on the left side
      const rFieldName = unescapeFieldName(rightField.key.fieldName);
      const lFieldName = unescapeFieldName(leftField.key.fieldName);
      table.swapFields(rFieldName, lFieldName);

      const editableRightField = table.getField(rightFieldName);
      const editableLeftField = table.getField(leftFieldName);

      // Swap dimensions
      if (editableLeftField.dim || editableRightField.dim) {
        editableLeftField.dim = false;
        editableRightField.dim = true;
      }

      // Swap fields on a multi-accessors list
      const formula = rightField.expressionMetadata?.text;
      const parsedFormula = rightField.expression;
      const isFieldReferenceFormula =
        parsedFormula instanceof FieldsReferenceExpression;

      if (
        rightField.fieldGroupIndex === leftField.fieldGroupIndex &&
        formula &&
        isFieldReferenceFormula
      ) {
        const targetFieldGroup = parsedTable.fields.filter(
          ({ fieldGroupIndex }) =>
            fieldGroupIndex === rightField.fieldGroupIndex
        );
        const rFieldIndex = targetFieldGroup.findIndex(
          ({ key }) => key.fieldName === rightFieldName
        );
        const lFieldIndex = targetFieldGroup.findIndex(
          ({ key }) => key.fieldName === leftFieldName
        );

        const { fields } = parsedFormula;
        [fields[rFieldIndex], fields[lFieldIndex]] = [
          fields[lFieldIndex],
          fields[rFieldIndex],
        ];
        const updatedAccessors = `[${fields.map((f) => f).join(',')}]`;

        const { relativeStart, relativeEnd } = parsedFormula;

        if (relativeStart !== undefined && relativeEnd !== undefined) {
          const updatedFormula =
            formula.slice(0, relativeStart) +
            updatedAccessors +
            formula.slice(relativeEnd + 1);
          table.setFieldFormula(rFieldName, updatedFormula);
        }
      }

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

      const fieldIndex = fields.findIndex((f) => f.key.fieldName === fieldName);
      if (fieldIndex === -1) return;

      const targetIndex =
        direction === 'left' ? fieldIndex - 1 : fieldIndex + 1;

      if (targetIndex < 0 || targetIndex >= fields.length) return;

      const leftFieldName =
        direction === 'left' ? fields[targetIndex].key.fieldName : fieldName;

      const rightFieldName =
        direction === 'left' ? fieldName : fields[targetIndex].key.fieldName;

      swapFields(tableName, rightFieldName, leftFieldName, direction);
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

  const cloneTable = useCallback(
    (tableName: string, options: { col?: number; row?: number } = {}) => {
      const context = findEditContext(tableName);
      if (!context || !sheetName) return;
      const currentSheet = parsedSheets[sheetName];
      const sheet = currentSheet.editableSheet;
      if (!sheet) return;

      const { table } = context;
      const unescapedSourceTableName = unescapeTableName(tableName);
      const uniqueNewTableName = escapeTableName(
        createUniqueName(
          unescapedSourceTableName + ' clone',
          collectTableNames(parsedSheets)
        )
      );

      try {
        const parsedNewSheet = SheetReader.parseSheet(table.toDSL());
        const editableNewSheet = parsedNewSheet.editableSheet;
        const parsedNewTable = parsedNewSheet.tables.find(
          (t) => t.tableName === tableName
        );

        if (!editableNewSheet || !parsedNewTable) return;

        const newTable = editableNewSheet.getTable(unescapedSourceTableName);
        newTable.name = uniqueNewTableName;

        const layoutDecorator = parsedNewTable.getLayoutDecorator();
        let targetCol = options.col;
        let targetRow = options.row;

        if (layoutDecorator && (!targetCol || !targetRow)) {
          targetCol = (layoutDecorator.params[0][1] ?? 1) + 1;
          targetRow = (layoutDecorator.params[0][0] ?? 1) + 1;
        }

        editLayoutDecorator(newTable, parsedNewTable, { targetRow, targetCol });
        newTable.detach();
        sheet.addTable(newTable);

        const historyTitle = `Cloned table "${tableName}" with new name "${uniqueNewTableName}"`;
        updateDSL({
          updatedSheetContent: sheet.toDSL(),
          historyTitle,
          sheetNameToChange: sheetName,
          tableName: uniqueNewTableName,
        });
      } catch (e) {
        return;
      }
    },
    [findEditContext, parsedSheets, sheetName, updateDSL]
  );

  const moveTableToSheet = useCallback(
    (
      tableName: string,
      sourceSheetName: string,
      destinationSheetName: string
    ) => {
      if (sourceSheetName === destinationSheetName) return;
      const destinationSheet = parsedSheets[destinationSheetName].editableSheet;
      const context = findEditContext(tableName);
      if (!context || !destinationSheet) return;

      const { sheet, table } = context;

      table.detach();
      destinationSheet.addTable(table);
      sheet.removeTable(tableName);

      const historyTitle = `Move table "${tableName}" from sheet "${sourceSheetName}" to sheet "${destinationSheetName}"`;
      updateDSL([
        {
          updatedSheetContent: sheet.toDSL(),
          sheetNameToChange: sourceSheetName,
          historyTitle,
          tableName,
        },
        {
          updatedSheetContent: destinationSheet.toDSL(),
          sheetNameToChange: destinationSheetName,
          historyTitle,
          tableName,
        },
      ]);
    },
    [findEditContext, parsedSheets, updateDSL]
  );

  return {
    arrangeTable: useSafeCallback(arrangeTable),
    cloneTable: useSafeCallback(cloneTable),
    convertToTable: useSafeCallback(convertToTable),
    deleteTable: useSafeCallback(deleteTable),
    deleteTables: useSafeCallback(deleteTables),
    flipTable: useSafeCallback(flipTable),
    moveTable: useSafeCallback(moveTable),
    moveTableTo: useSafeCallback(moveTableTo),
    moveTableToSheet: useSafeCallback(moveTableToSheet),
    renameTable: useSafeCallback(renameTable),
    swapFields: useSafeCallback(swapFields),
    swapFieldsByDirection: useSafeCallback(swapFieldsByDirection),
    toggleTableTitleOrHeaderVisibility: useSafeCallback(
      toggleTableTitleOrHeaderVisibility
    ),
    updateTableDecoratorValue: useSafeCallback(updateTableDecoratorValue),
  };
}
