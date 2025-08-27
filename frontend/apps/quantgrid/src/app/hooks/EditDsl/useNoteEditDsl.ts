import { useCallback } from 'react';

import { noteToComment } from '@frontend/common';

import { useSafeCallback } from '../useSafeCallback';
import { useDSLUtils } from './useDSLUtils';

export function useNoteEditDsl() {
  const { updateDSL, findEditContext } = useDSLUtils();

  const updateNote = useCallback(
    ({
      tableName,
      fieldName,
      note,
    }: {
      tableName: string;
      fieldName?: string;
      note: string | null;
    }) => {
      const context = findEditContext(tableName, fieldName);
      if (!context) return;

      const { sheet, table, field, sheetName } = context;
      const docString = note ? noteToComment(note) : null;

      if (!fieldName) {
        table.docString = docString;

        const historyTitle = docString
          ? `Update note for ${tableName}`
          : `Remove note from ${tableName}`;
        updateDSL({
          updatedSheetContent: sheet.toDSL(),
          sheetNameToChange: sheetName,
          historyTitle,
          tableName,
        });

        return;
      }

      if (!field) return;

      field.docString = docString;

      const historyTitle = docString
        ? `Update note for ${tableName}[${fieldName}]`
        : `Remove note from ${tableName}[${fieldName}]`;

      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        sheetNameToChange: sheetName,
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  const removeNote = useCallback(
    (tableName: string, fieldName?: string) => {
      updateNote({
        tableName,
        fieldName,
        note: null,
      });
    },
    [updateNote]
  );

  return {
    removeNote: useSafeCallback(removeNote),
    updateNote: useSafeCallback(updateNote),
  };
}
