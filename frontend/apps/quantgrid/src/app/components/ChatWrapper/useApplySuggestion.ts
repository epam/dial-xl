import { useCallback, useContext } from 'react';

import { GPTSuggestion } from '@frontend/common';
import {
  createEditableSheet,
  Decorator,
  fieldColSizeDecoratorName,
  newLine,
  SheetReader,
  unescapeTableName,
} from '@frontend/parser';

import {
  AppSpreadsheetInteractionContext,
  ProjectContext,
  UndoRedoContext,
  ViewportContext,
} from '../../context';
import { useGridApi } from '../../hooks';
import { autoSizeTableHeader } from '../../hooks/EditDsl/utils';
import {
  autoRenameTables,
  autoTablePlacement,
  findLastChangedTable,
} from '../../services';
import { DslSheetChange } from '../../types/dslSheetChange';
import { getExpandedTextSize } from '../../utils';

const maxMessageLength = 5000;

export function useApplySuggestions() {
  const grid = useGridApi();
  const {
    projectName,
    sheetName,
    updateSheetContent,
    projectSheets,
    sheetContent,
    parsedSheets,
  } = useContext(ProjectContext);
  const { viewGridData } = useContext(ViewportContext);
  const { appendTo } = useContext(UndoRedoContext);
  const { openTable } = useContext(AppSpreadsheetInteractionContext);

  const getDslWithExpandedSizes = useCallback(
    (sheetChange: string, existingTableNames: string[]) => {
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

        table.fields.reduce((acc, field) => {
          const fieldSizeDecorator = parsedTable?.fields
            .find((parsedField) => field.name === parsedField.key.fieldName)
            ?.decorators?.find(
              (decorator) =>
                decorator.decoratorName === fieldColSizeDecoratorName
            );
          if (fieldSizeDecorator) {
            const fieldSize = fieldSizeDecorator.params[0][0];
            acc += fieldSize ?? 1;

            return acc;
          }

          const fieldSize = getExpandedTextSize({
            text: field.name,
            col: col + acc,
            grid,
            projectName,
            sheetName,
          });

          if (fieldSize && fieldSize > 1) {
            field.addDecorator(
              new Decorator(fieldColSizeDecoratorName, `(${fieldSize})`)
            );
          }
          acc += fieldSize ?? 1;

          return acc;
        }, 0);

        autoSizeTableHeader(table, col, grid, projectName, sheetName);
      });

      return editableSheet.toDSL();
    },
    [grid, projectName, sheetName]
  );

  const getDSLChanges = useCallback(
    (
      GPTSuggestions: GPTSuggestion[] | null,
      sheetName: string,
      sheetContent: string
    ): DslSheetChange[] => {
      if (!GPTSuggestions) return [];

      const currentSheetSuggestions = GPTSuggestions.filter(
        (suggestion) => suggestion.sheetName === sheetName
      );
      const otherSheetsSuggestions = GPTSuggestions.filter(
        (suggestion) =>
          !!suggestion.sheetName && suggestion.sheetName !== sheetName
      );
      const withoutSheetSuggestions = GPTSuggestions.filter(
        (suggestion) => !suggestion.sheetName
      );

      const existingTableNames = Object.values(parsedSheets)
        .map((sheet) => sheet.tables.map((table) => table.tableName))
        .flat();

      const tableStructures = viewGridData.getGridTableStructure();

      const currentSheetDSLChanges: DslSheetChange | undefined =
        currentSheetSuggestions.map(
          ({ sheetName: suggestionSheetName, dsl }) => ({
            sheetName: suggestionSheetName!,
            content: autoTablePlacement(
              dsl,
              tableStructures,
              grid,
              projectName,
              sheetName
            ),
          })
        )[0];

      // We need to append dsl to current sheet if suggestionSheetName not presented
      const appendDslChanges = withoutSheetSuggestions.length
        ? withoutSheetSuggestions.reduce(
            (acc, curr) => ({
              sheetName: sheetName,
              content: autoRenameTables(
                autoTablePlacement(
                  `${acc.content}${newLine}${newLine}${curr.dsl}`,
                  tableStructures,
                  grid,
                  projectName,
                  sheetName
                ),
                sheetName,
                projectSheets ?? []
              ),
            }),
            {
              sheetName,
              content: currentSheetDSLChanges?.content ?? sheetContent ?? '',
            }
          )
        : undefined;

      const existingSheetsChanges = otherSheetsSuggestions.map(
        ({ sheetName: suggestionSheetName, dsl }) => ({
          sheetName: suggestionSheetName!,
          content: autoTablePlacement(
            dsl,
            tableStructures,
            grid,
            projectName,
            sheetName
          ),
        })
      );

      const dslChanges = [
        ...existingSheetsChanges,
        appendDslChanges ?? currentSheetDSLChanges ?? undefined,
      ]
        .filter((change) => change)
        .map((change) => {
          return {
            sheetName: change.sheetName,
            content:
              change.content &&
              getDslWithExpandedSizes(change.content, existingTableNames),
          };
        });

      return dslChanges;
    },
    [
      parsedSheets,
      viewGridData,
      grid,
      projectName,
      projectSheets,
      getDslWithExpandedSizes,
    ]
  );

  const openLastChangedTable = useCallback(
    (GPTSuggestions: GPTSuggestion[]) => {
      const lastSuggestion = GPTSuggestions[GPTSuggestions.length - 1];
      let lastSuggestionSheet;

      if (lastSuggestion.sheetName) {
        lastSuggestionSheet = projectSheets?.find(
          (s) => s.sheetName === lastSuggestion.sheetName
        );
      }
      if (!lastSuggestion.sheetName) return;

      const lastChangedTable = findLastChangedTable(
        lastSuggestionSheet?.content || '',
        lastSuggestion.dsl
      );

      if (!lastChangedTable) return;

      openTable(lastSuggestion.sheetName, lastChangedTable.tableName);
    },
    [openTable, projectSheets]
  );

  const applySuggestion = useCallback(
    async (GPTSuggestions: GPTSuggestion[] | null) => {
      if (
        !sheetName ||
        !GPTSuggestions ||
        !GPTSuggestions.length ||
        sheetContent === null
      )
        return;

      const dslChanges = getDSLChanges(GPTSuggestions, sheetName, sheetContent);

      const sheetsNamesToChange = dslChanges.map((change) => change.sheetName);
      const userMessage = GPTSuggestions[0].userMessage;

      const historyTitle = userMessage
        ? `AI action: ${userMessage.slice(0, maxMessageLength)}`
        : `AI action: change worksheets "${sheetsNamesToChange.join(', ')}"`;

      await updateSheetContent(dslChanges);

      appendTo(historyTitle, dslChanges);

      openLastChangedTable(GPTSuggestions);
    },
    [
      sheetName,
      sheetContent,
      getDSLChanges,
      updateSheetContent,
      appendTo,
      openLastChangedTable,
    ]
  );

  return {
    applySuggestion,
  };
}
