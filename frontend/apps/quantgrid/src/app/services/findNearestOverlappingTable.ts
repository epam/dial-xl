import { GridTable } from '@frontend/common';
import { ParsedTable } from '@frontend/parser';

export function findNearestOverlappingTable(
  targetGridTable: GridTable,
  targetParsedTable: ParsedTable,
  tableStructures: GridTable[],
  parsedTables: ParsedTable[],
  isForward: boolean
): ParsedTable | undefined {
  const overlappingTables = parsedTables.filter((table) => {
    if (table.tableName === targetGridTable.tableName) return false;

    const otherGridTable = tableStructures.find(
      (ts) => ts.tableName === table.tableName
    );

    if (!otherGridTable) return false;

    const overlap = !(
      otherGridTable.endRow < targetGridTable.startRow ||
      otherGridTable.startRow > targetGridTable.endRow ||
      otherGridTable.endCol < targetGridTable.startCol ||
      otherGridTable.startCol > targetGridTable.endCol
    );

    if (overlap && targetParsedTable.dslPlacement && table.dslPlacement) {
      const targetStartOffset = targetParsedTable.dslPlacement.startOffset;
      const otherStartOffset = table.dslPlacement.startOffset;

      return isForward
        ? otherStartOffset > targetStartOffset
        : otherStartOffset < targetStartOffset;
    }

    return false;
  });

  let nearestTable: ParsedTable | undefined;
  let minOffsetDifference = Infinity;

  for (const table of overlappingTables) {
    if (!table.dslPlacement || !targetParsedTable.dslPlacement) continue;

    const offsetDifference = Math.abs(
      table.dslPlacement.startOffset -
        targetParsedTable.dslPlacement.startOffset
    );

    if (offsetDifference < minOffsetDifference) {
      minOffsetDifference = offsetDifference;
      nearestTable = table;
    }
  }

  return nearestTable;
}
