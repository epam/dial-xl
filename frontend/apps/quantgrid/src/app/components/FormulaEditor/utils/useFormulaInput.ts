import { useCallback, useContext } from 'react';

import { SelectedCell, SelectedCellType } from '@frontend/spreadsheet';

import { ProjectContext, SpreadsheetContext } from '../../../context';
import {
  useDSLUtils,
  useOverridesManualEditDSL,
  useSubmitCellEditor,
  verifyDslHasSameSetTablesAndFields,
} from '../../../hooks';

export function useFormulaInput() {
  const { sheetContent, openStatusModal } = useContext(ProjectContext);
  const { gridApi } = useContext(SpreadsheetContext);
  const { findTableField, findTable, updateDSL } = useDSLUtils();
  const { editOverride, addOverride } = useOverridesManualEditDSL();
  const { submitCellEditor } = useSubmitCellEditor();

  const getSelectedCellValue = useCallback(
    (selectedCell: SelectedCell | null, fieldName?: string) => {
      const { Table, Field, Override, Cell, EmptyCell } = SelectedCellType;

      if (!selectedCell || (!fieldName && selectedCell.type === Table)) {
        return null;
      }

      const { type } = selectedCell;

      if (type === EmptyCell) return '';
      if (type === Override) return selectedCell.value || '';

      if ([Field, Table, Cell].includes(type)) {
        const { tableName, value } = selectedCell;

        if (!tableName) return null;

        const field = findTableField(
          tableName,
          fieldName || selectedCell?.fieldName || value || ''
        );

        if (!field || !field.expressionMetadata) return null;

        return field.expressionMetadata.text;
      }

      return null;
    },
    [findTableField]
  );

  const saveFormulaInputValue = useCallback(
    (
      code: string,
      selectedCell: SelectedCell | null,
      dimFieldName?: string
    ) => {
      if (!selectedCell) return;

      const { Table, Field, Override, Cell, EmptyCell } = SelectedCellType;
      const { type, tableName, col, row, value, overrideIndex } = selectedCell;
      const fieldName = dimFieldName || selectedCell.fieldName;

      if (type === EmptyCell) return submitCellEditor(col, row, code);

      if (!tableName) return;

      if (type === Override && fieldName && overrideIndex !== undefined) {
        editOverride(tableName, fieldName, overrideIndex, code);
      }

      if (type === Cell && fieldName) {
        const table = findTable(tableName);
        const field = findTableField(tableName, fieldName);

        if (!table || field?.expressionMetadata?.text === code) return;

        const [startRow] = table.getPlacement();
        const tableRow = row - startRow - 2;
        addOverride(tableName, fieldName, tableRow, code);
      }

      if ([Field, Table].includes(type) && sheetContent && gridApi) {
        const field = findTableField(tableName, fieldName || value || '');

        if (
          !field ||
          !field.expressionMetadata ||
          field.expressionMetadata.text === code
        )
          return;

        const { start, end } = field.expressionMetadata;
        const updatedSheetContent =
          sheetContent.substring(0, start) +
          code +
          sheetContent.substring(end + 1);

        if (
          verifyDslHasSameSetTablesAndFields(sheetContent, updatedSheetContent)
        ) {
          openStatusModal('Incorrect expression');

          return;
        }

        updateDSL(updatedSheetContent);
      }
    },
    [
      addOverride,
      editOverride,
      findTable,
      findTableField,
      gridApi,
      openStatusModal,
      sheetContent,
      submitCellEditor,
      updateDSL,
    ]
  );

  const isFormulaInputDisabled = useCallback(
    (selectedCell: SelectedCell | null) =>
      !selectedCell ||
      (!selectedCell.fieldName && selectedCell.type === SelectedCellType.Table),
    []
  );

  return {
    saveFormulaInputValue,
    getSelectedCellValue,
    isFormulaInputDisabled,
  };
}
