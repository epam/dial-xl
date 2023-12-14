import { ParsedTable, SheetReader } from '@frontend/parser';

type Placement = [number, number];

type Result = {
  tableName: string;
  dslStartOffset: number;
  startCol: number;
};

export const autoTablePlacement = (dsl: string) => {
  try {
    const parsedSheet = SheetReader.parseSheet(dsl);
    const { tables } = parsedSheet;

    const emptyPlacementTables = tables.filter((t) => !t.hasPlacement());

    if (emptyPlacementTables.length === 0) return dsl;

    const placements = getTableWithPlacement(tables);
    const newTablePlacements: Result[] = [];

    while (emptyPlacementTables.length !== 0) {
      let currentStartCol = 1;
      const table = emptyPlacementTables.shift();

      if (!table || !table?.dslPlacement) break;

      const { fields, dslPlacement, tableName } = table;
      const columnsCount = fields.length;

      const newPlacement = {
        tableName,
        dslStartOffset: dslPlacement.startOffset,
        startCol: currentStartCol,
      };

      for (let i = 0; i < placements.length; i++) {
        const [start, end] = placements[i];

        if (start > currentStartCol + columnsCount) {
          newTablePlacements.push({
            ...newPlacement,
            startCol: currentStartCol,
          });
          placements.splice(i, 0, [
            currentStartCol,
            currentStartCol + columnsCount - 1,
          ]);

          break;
        } else {
          currentStartCol = end + 2;
        }
      }

      const isPlacementFound = newTablePlacements.findIndex(
        (t) => t.tableName === table.tableName
      );

      if (isPlacementFound === -1) {
        newTablePlacements.push({ ...newPlacement, startCol: currentStartCol });
        placements.push([currentStartCol, currentStartCol + columnsCount - 1]);
      }
    }

    if (newTablePlacements.length === 0) return dsl;

    const reversedTablesByPlacement = newTablePlacements.sort((a, b) => {
      return b.dslStartOffset - a.dslStartOffset;
    });

    let updatedDsl = dsl;

    reversedTablesByPlacement.forEach((t) => {
      updatedDsl =
        updatedDsl.substring(0, t.dslStartOffset) +
        `!placement(1,${t.startCol})\r\n` +
        updatedDsl.substring(t.dslStartOffset);
    });

    return updatedDsl;
  } catch (error) {
    return dsl;
  }
};

const getTableWithPlacement = (tables: ParsedTable[]): Placement[] => {
  return tables
    .filter((t) => t.hasPlacement())
    .map((t) => {
      const [, col] = t.getPlacement();
      const columnCount = t.fields.length;
      const colPlacement: Placement = [col, col + columnCount - 1];

      return colPlacement;
    })
    .sort((a, b) => a[0] - b[0]);
};
