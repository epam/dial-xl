import { useCallback, useContext } from 'react';

import { GPTSuggestion } from '@frontend/common';

import {
  AppSpreadsheetInteractionContext,
  ProjectContext,
  UndoRedoContext,
} from '../../context';
import { autoTablePlacement, findLastChangedTable } from '../../services';

const maxMessageLength = 5000;

export function useApplySuggestions() {
  const { sheetName, updateSheetContent, projectSheets } =
    useContext(ProjectContext);

  const { appendTo } = useContext(UndoRedoContext);
  const { openTable } = useContext(AppSpreadsheetInteractionContext);

  const applySuggestion = useCallback(
    async (GPTSuggestions: GPTSuggestion[] | null) => {
      if (!sheetName || !GPTSuggestions || !GPTSuggestions.length) return;

      const lastSuggestion = GPTSuggestions[GPTSuggestions.length - 1];
      let lastSuggestionSheet;

      if (lastSuggestion.sheetName) {
        lastSuggestionSheet = projectSheets?.find(
          (s) => s.sheetName === lastSuggestion.sheetName
        );
      }

      for (let i = 0; i < GPTSuggestions.length; i++) {
        const {
          sheetName: suggestionSheetName,
          userMessage,
          dsl,
        } = GPTSuggestions[i];

        const dslWithAutoPlacedTables = autoTablePlacement(dsl);
        const historyTitle = userMessage
          ? `AI action: ${userMessage.slice(0, maxMessageLength)}`
          : `AI action: change worksheet "${suggestionSheetName || sheetName}"`;

        if (suggestionSheetName) {
          await updateSheetContent(
            suggestionSheetName,
            dslWithAutoPlacedTables
          );

          appendTo(suggestionSheetName, historyTitle, dslWithAutoPlacedTables);

          continue;
        }

        await updateSheetContent(sheetName, dslWithAutoPlacedTables);

        appendTo(sheetName, historyTitle, dslWithAutoPlacedTables);
      }

      if (!lastSuggestion.sheetName) return;

      const lastChangedTable = findLastChangedTable(
        lastSuggestionSheet?.content || '',
        lastSuggestion.dsl
      );

      if (!lastChangedTable) return;

      openTable(lastSuggestion.sheetName, lastChangedTable.tableName);
    },
    [sheetName, openTable, projectSheets, updateSheetContent, appendTo]
  );

  return {
    applySuggestion,
  };
}
