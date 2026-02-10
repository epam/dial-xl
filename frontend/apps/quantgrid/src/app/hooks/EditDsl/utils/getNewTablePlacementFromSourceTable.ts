import { ParsedSheets } from '@frontend/parser';

import { ViewGridData } from '../../../context';

// Returns a suggested placement for a new table based on an existing table name.
// - If the table is found in the viewGridData, place the new table
//   just after the table's end column (same start row).
// - If it's not found there, use the original parsed table placement and offset
//   it by one row and one column.
// - If the table cannot be found at all, default to [1, 1].
export function getNewTablePlacementFromSourceTable(
  tableName: string,
  viewGridData: ViewGridData,
  parsedSheets: ParsedSheets
): [number, number] {
  const tableStructure = viewGridData.getGridTableStructure();

  const findTableStructure = tableStructure.find(
    (table) => table.tableName === tableName
  );

  if (findTableStructure) {
    return [findTableStructure.endCol + 2, findTableStructure.startRow];
  }

  let parsedTable = null;

  for (const sheetName of Object.keys(parsedSheets)) {
    const table = parsedSheets[sheetName].tables.find(
      (t) => t.tableName === tableName
    );

    if (table) {
      parsedTable = table;
      break;
    }
  }

  if (!parsedTable) return [1, 1];

  const [row, col] = parsedTable.getPlacement();

  return [col + 1, row + 1];
}
