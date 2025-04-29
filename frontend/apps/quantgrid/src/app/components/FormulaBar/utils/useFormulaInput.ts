import { useCallback, useContext } from 'react';

import { GridCellEditorMode } from '@frontend/canvas-spreadsheet';
import { extractExpression } from '@frontend/parser';

import { SelectedCell, SelectedCellType } from '../../../common';
import { AppContext, ProjectContext } from '../../../context';
import { useDSLUtils, useGridApi, useSubmitCellEditor } from '../../../hooks';
import { isOverrideValueFormula } from '../../../utils/override';

export function useFormulaInput() {
  const { projectName, openStatusModal } = useContext(ProjectContext);
  const { formulaBarMode } = useContext(AppContext);
  const { findTableField, findTable } = useDSLUtils();
  const { submitCellEditor } = useSubmitCellEditor();
  const gridApi = useGridApi();

  const getSelectedCellValue = useCallback(
    (selectedCell: SelectedCell | null, fieldName?: string): string | null => {
      const { Table, Field, Override, Cell, EmptyCell, Total } =
        SelectedCellType;

      if (!selectedCell || (!fieldName && selectedCell.type === Table)) {
        return null;
      }
      const { type, overrideValue, tableName, value, totalIndex } =
        selectedCell;

      if (type === EmptyCell) return '';
      if (type === Total) {
        if (formulaBarMode === 'value') return selectedCell.value || '';

        if (!tableName || !totalIndex) return null;

        const table = findTable(tableName);

        if (!table) return null;

        const fieldTotal = table.total?.getFieldTotalByIndex(
          fieldName || selectedCell.fieldName || '',
          totalIndex
        );

        if (!fieldTotal) return '=';

        return `=${extractExpression(fieldTotal.expression)}`;
      }
      if (type === Override || (type === Cell && formulaBarMode === 'value'))
        return isOverrideValueFormula(overrideValue) &&
          formulaBarMode === 'formula'
          ? `=${extractExpression(overrideValue?.toString())}`
          : selectedCell.value || '';

      if ([Field, Table, Cell].includes(type)) {
        if (!tableName) return null;

        const field = findTableField(
          tableName,
          fieldName || selectedCell?.fieldName || value || ''
        );

        if (!field || !field.expressionMetadata) return null;

        return `=${extractExpression(field.expressionMetadata.text)}`;
      }

      return null;
    },
    [findTable, findTableField, formulaBarMode]
  );

  const saveFormulaInputValue = useCallback(
    (
      code: string,
      selectedCell: SelectedCell | null,
      editMode: GridCellEditorMode,
      dimFieldName?: string
    ) => {
      if (!projectName || !selectedCell || !gridApi) return;

      const cell = gridApi.getCell(selectedCell.col, selectedCell.row);

      return submitCellEditor({
        editMode,
        currentCell: selectedCell,
        cell,
        value: code,
        dimFieldName,
        openStatusModal,
      });
    },
    [projectName, gridApi, submitCellEditor, openStatusModal]
  );

  return {
    saveFormulaInputValue,
    getSelectedCellValue,
  };
}
