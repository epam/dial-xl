import { useCallback, useContext } from 'react';

import {
  DslSheetChange,
  GPTFocusColumn,
  GPTSuggestion,
  useIsMobile,
  WorksheetState,
} from '@frontend/common';
import {
  createEditableSheet,
  Decorator,
  escapeFieldName,
  escapeTableName,
  fieldColSizeDecoratorName,
  SheetReader,
  unescapeTableName,
} from '@frontend/parser';

import {
  AppSpreadsheetInteractionContext,
  CommonContext,
  ProjectContext,
  UndoRedoContext,
  ViewportContext,
} from '../../context';
import { useGridApi } from '../../hooks';
import { autoSizeTableHeader } from '../../hooks/EditDsl/utils';
import { autoTablePlacement, findLastChangedTable } from '../../services';
import { getExpandedTextSize } from '../../utils';

const maxMessageLength = 5000;

export function useApplySuggestions() {
  const grid = useGridApi();
  const { viewGridData } = useContext(ViewportContext);
  const {
    projectName,
    sheetName,
    updateSheetContent,
    projectSheets,
    sheetContent,
    parsedSheets,
    responseIds,
  } = useContext(ProjectContext);
  const { appendTo } = useContext(UndoRedoContext);
  const { sharedRef } = useContext(CommonContext);
  const { openTable, openField } = useContext(AppSpreadsheetInteractionContext);
  const isMobile = useIsMobile();

  const getDslWithExpandedSizes = useCallback(
    (sheetChange: string, existingTableNames: string[]) => {
      try {
        const parsedSheet = SheetReader.parseSheet(sheetChange);
        const editableSheet = createEditableSheet(
          'EditableSheet',
          sheetChange,
          parsedSheet.tables
        );
        editableSheet.tables.forEach((table) => {
          table.emptyLineBefore = true;
          if (existingTableNames.includes(table.name)) return;

          const parsedTable = parsedSheet.tables.find(
            (parsedTable) =>
              unescapeTableName(parsedTable.tableName) === table.name
          );
          const col = parsedTable?.getLayoutDecorator()?.params[0][1];
          let offset = 0;

          parsedTable?.fields.forEach((parsedField) => {
            const fieldName = parsedField.key.fieldName;
            const field = table.getField(fieldName);

            if (!field) return;

            const fieldSizeDecorator = parsedField.decorators?.find(
              (decor) => decor.decoratorName === fieldColSizeDecoratorName
            );

            if (
              fieldSizeDecorator ||
              field.hasDecorator(fieldColSizeDecoratorName)
            ) {
              const fieldSize = fieldSizeDecorator?.params?.[0]?.[0] ?? 1;
              offset += fieldSize;

              return;
            }

            const fieldSize = getExpandedTextSize({
              text: field.name,
              col: col + offset,
              grid,
              projectName,
              sheetName,
            });

            if (fieldSize && fieldSize > 1) {
              field.addDecorator(
                new Decorator(fieldColSizeDecoratorName, `(${fieldSize})`)
              );
            }

            offset += fieldSize ?? 1;
          });

          autoSizeTableHeader(table, col, grid, projectName, sheetName);
        });

        return editableSheet.toDSL();
      } catch {
        // Just return initial sheet change
        return sheetChange;
      }
    },
    [grid, projectName, sheetName]
  );

  const getDSLChanges = useCallback(
    (
      GPTSuggestions: GPTSuggestion[] | null,
      sheetName: string,
      currentSheets: WorksheetState[],
      ignoreViewportWhenPlacing: boolean
    ): DslSheetChange[] => {
      if (!GPTSuggestions) return [];

      const tableStructures = viewGridData.getGridTableStructure();

      const existingTableNames = Object.values(parsedSheets)
        .map((sheet) => sheet.tables.map((table) => table.tableName))
        .flat();

      const existingSheetsChanges = GPTSuggestions.map(
        ({ sheetName: suggestionSheetName, dsl }) => ({
          sheetName: suggestionSheetName,
          content: autoTablePlacement(
            dsl,
            ignoreViewportWhenPlacing ? [] : tableStructures,
            grid,
            projectName,
            sheetName
          ),
        })
      );

      const newSheetNames = existingSheetsChanges.map(
        (sheet) => sheet.sheetName
      );
      const oldSheetNames = currentSheets.map((sheet) => sheet.sheetName);
      const resultedChanges = Array.from(
        new Set([...newSheetNames, ...oldSheetNames])
      )
        .map((sheetName) => {
          const sheetChange = existingSheetsChanges.find(
            (sheet) => sheet.sheetName === sheetName
          )?.content;

          return {
            sheetName,
            content: sheetChange,
          };
        })
        .map((change) => {
          return {
            sheetName: change.sheetName,
            content:
              change.content &&
              getDslWithExpandedSizes(change.content, existingTableNames),
          };
        });

      return resultedChanges;
    },
    [viewGridData, parsedSheets, grid, projectName, getDslWithExpandedSizes]
  );

  const onFocusColumns = useCallback(
    (focusColumns: GPTFocusColumn[]) => {
      const focusedColumn = focusColumns[focusColumns.length - 1];

      if (!focusedColumn) return;

      openField(
        focusedColumn.sheetName,
        escapeTableName(focusedColumn.tableName),
        escapeFieldName(focusedColumn.columnName)
      );

      if (isMobile) {
        sharedRef.current.layoutContext?.closeAllPanels?.();
      }
    },
    [isMobile, openField, sharedRef]
  );

  const openLastChangedTable = useCallback(
    (GPTSuggestions: GPTSuggestion[], dslChanges: DslSheetChange[]) => {
      const lastSuggestion = GPTSuggestions[GPTSuggestions.length - 1];
      const lastSuggestionSheet = dslChanges?.find(
        (s) => s.sheetName === (lastSuggestion.sheetName ?? sheetName)
      );
      if (!lastSuggestionSheet?.sheetName) return;

      const lastChangedTable = findLastChangedTable(
        lastSuggestionSheet?.content || '',
        lastSuggestion.dsl
      );

      if (!lastChangedTable) return;

      openTable(lastSuggestionSheet.sheetName, lastChangedTable.tableName);
      if (isMobile) {
        sharedRef.current.layoutContext?.closeAllPanels?.();
      }
    },
    [isMobile, openTable, sharedRef, sheetName]
  );

  const applySuggestion = useCallback(
    async (
      GPTSuggestions: GPTSuggestion[] | null,
      focusColumns: GPTFocusColumn[] | null,
      {
        withPut = true,
        withHistoryItem = true,
        responseId,
        ignoreViewportWhenPlacing = false,
      }: {
        withPut?: boolean;
        withHistoryItem?: boolean;
        responseId?: string;
        ignoreViewportWhenPlacing?: boolean;
      } = {
        withPut: true,
        withHistoryItem: true,
        ignoreViewportWhenPlacing: false,
      }
    ) => {
      if (
        !sheetName ||
        !GPTSuggestions ||
        !GPTSuggestions.length ||
        sheetContent === null ||
        !projectSheets
      )
        return;

      const dslChanges = getDSLChanges(
        GPTSuggestions,
        sheetName,
        projectSheets,
        ignoreViewportWhenPlacing
      );

      const sheetsNamesToChange = dslChanges.map((change) => change.sheetName);
      const userMessage = GPTSuggestions[0].userMessage;

      if (withHistoryItem) {
        const actionPrefix = 'AI action:';
        const historyTitle = userMessage
          ? `${actionPrefix} ${userMessage.slice(0, maxMessageLength)}`
          : `${actionPrefix} change worksheets "${sheetsNamesToChange.join(
              ', '
            )}"`;
        appendTo(historyTitle, dslChanges);
      }
      const updatedResponseIds = responseId
        ? [...responseIds, { responseId }]
        : undefined;
      await updateSheetContent(dslChanges, {
        sendPutWorksheet: withPut,
        responseIds: updatedResponseIds,
      });

      if (focusColumns?.length) {
        onFocusColumns(focusColumns);
      } else {
        openLastChangedTable(GPTSuggestions, dslChanges);
      }
    },
    [
      sheetName,
      sheetContent,
      projectSheets,
      getDSLChanges,
      responseIds,
      updateSheetContent,
      appendTo,
      onFocusColumns,
      openLastChangedTable,
    ]
  );

  return {
    applySuggestion,
    onFocusColumns,
  };
}
