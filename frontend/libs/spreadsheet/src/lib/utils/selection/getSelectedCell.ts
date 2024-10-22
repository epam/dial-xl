import { MutableRefObject } from 'react';

import { GridCell } from '@frontend/common';

import { GridSelection } from '../../grid';
import { GridService } from '../../services';
import { SelectedCell, SelectedCellType } from '../../types';

export function getSelectedCell(
  gridServiceRef: MutableRefObject<GridService | null>,
  selection: GridSelection
): SelectedCell | null {
  const { startRow, startCol } = selection;
  let cell = gridServiceRef.current?.getCellValue(startRow, startCol);

  if (cell?.field && cell.startCol !== cell?.col) {
    cell = gridServiceRef.current?.getCellValue(startRow, cell.startCol);
  }

  if (!cell?.table) {
    return {
      type: SelectedCellType.EmptyCell,
      col: startCol,
      row: startRow,
    };
  }

  const { table, value } = cell;

  if (table?.startRow === undefined && !table?.startCol === undefined)
    return null;

  const type = getSelectionType(cell, cell.isOverride);

  return {
    tableName: cell.table?.tableName || '',
    fieldName: cell.field?.fieldName,
    overrideIndex: cell.overrideIndex,
    overrideValue: cell.overrideValue,
    totalIndex: cell.totalIndex,
    isDynamic: cell.field?.isDynamic,
    col: cell.col,
    row: cell.row,
    type,
    value,
  };
}

function getSelectionType(
  cell: GridCell,
  isOverride = false
): SelectedCellType {
  if (cell.isTableHeader) return SelectedCellType.Table;

  if (cell.isFieldHeader) return SelectedCellType.Field;

  if (cell.totalIndex) return SelectedCellType.Total;

  if (isOverride) return SelectedCellType.Override;

  return SelectedCellType.Cell;
}
