import { MutableRefObject } from 'react';

import { GridSelection } from '../../grid';
import { GridService } from '../../services';
import { SelectedCell, SelectedCellType } from '../../types';

export function getSelectedCell(
  gridServiceRef: MutableRefObject<GridService | null>,
  selection: GridSelection
): SelectedCell | null {
  const { startRow, endCol, endRow, startCol } = selection;
  const cell = gridServiceRef.current?.getCellValue(startRow, startCol);

  if (!cell?.table || !cell?.value) {
    return {
      type: SelectedCellType.EmptyCell,
      col: startCol,
      row: startRow,
    };
  }

  const { table, value, row } = cell;

  if (table?.startRow === undefined && !table?.startCol === undefined)
    return null;

  const tableHeader = gridServiceRef.current?.getCellValue(
    table.startRow,
    table.startCol
  );

  const type = getSelectionType(table.startRow, startRow, row, cell.isOverride);

  if (
    !(endCol === startCol && endRow === startRow) &&
    type !== SelectedCellType.Table
  )
    return null;

  return {
    tableName: tableHeader?.value || '',
    fieldName: cell.field?.fieldName,
    overrideIndex: cell.overrideIndex,
    isDynamic: cell.field?.isDynamic,
    col: startCol,
    row,
    type,
    value,
  };
}

function getSelectionType(
  tableStartRow: number,
  startRow: number,
  cellRow: number,
  isOverride = false
): SelectedCellType {
  if (tableStartRow === startRow) return SelectedCellType.Table;

  if (tableStartRow + 1 === cellRow) return SelectedCellType.Field;

  if (isOverride) return SelectedCellType.Override;

  return SelectedCellType.Cell;
}
