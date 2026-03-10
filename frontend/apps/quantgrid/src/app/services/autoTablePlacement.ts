import {
  defaultGridSizes,
  GridApi,
  GridTable,
} from '@frontend/canvas-spreadsheet';
import { defaultChartCols, defaultChartRows } from '@frontend/common';
import {
  minTablePlacement,
  ParsedField,
  ParsedSheet,
  ParsedTable,
  Sheet,
  SheetReader,
  Table,
  unescapeTableName,
} from '@frontend/parser';

import { editLayoutDecorator } from '../hooks';
import { fieldNameSizeLimit, getExpandedTextSize } from '../utils';

type ExistingRect = {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
};

type PlacedTable = {
  table: Table;
  parsedTable: ParsedTable;
  startRow: number;
  startCol: number;
};

const borderMargin = 1;
const virtualDimTableRowsCount = 100;

type TableDimension = {
  width: number;
  height: number;
  startRow: number;
  startCol: number;
};
type TableDimensionCache = Map<string, TableDimension>;
type PlacementCtx = {
  tableStructureMap: Map<string, GridTable>;
  expandedTextSizeCache: Map<string, number | undefined>;
  columnsCountCache: Map<string, number>;
  tableDimensionsCache: TableDimensionCache;
};

/**
 * Places any unpositioned tables in the DSL so they don't overlap existing tables.
 * Clamps placements that fall outside the valid grid bounds (row/col < 1).
 */
export function autoTablePlacement(
  dsl: string,
  tableStructures: GridTable[],
  grid: GridApi | null,
  projectName: string | null,
  sheetName: string | null,
): string {
  try {
    let parsedSheet = SheetReader.parseSheet(dsl);
    let editableSheet = parsedSheet.editableSheet;

    if (!editableSheet) return dsl;

    const placementCtx = initPlacementCtx(tableStructures);
    const movedResult = moveTablesOutOfSpreadsheetEdges(
      dsl,
      parsedSheet.tables,
      editableSheet,
    );

    if (movedResult.hasChanges) {
      dsl = movedResult.dsl;
      parsedSheet = SheetReader.parseSheet(dsl);
      editableSheet = parsedSheet.editableSheet;
    }

    if (!editableSheet) return dsl;

    const { tables } = parsedSheet;
    const emptyPlacementTables = tables.filter((t) => !t.hasPlacement());

    if (emptyPlacementTables.length === 0) return dsl;

    const existingRectangles = buildExistingRectangles(
      emptyPlacementTables,
      placementCtx,
      tables,
      grid,
      projectName,
      sheetName,
    );

    const foundTablePlacements: PlacedTable[] = [];
    for (const parsedTable of emptyPlacementTables) {
      const { tableName } = parsedTable;
      const table = editableSheet.getTable(unescapeTableName(tableName));

      const foundPlacement = findNearestPlacement(
        existingRectangles,
        parsedTable,
        placementCtx,
        grid,
        projectName,
        sheetName,
      );

      if (foundPlacement) {
        const { row, col, width, height } = foundPlacement;
        const placedRect: ExistingRect = {
          startRow: row,
          endRow: row + height,
          startCol: col,
          endCol: col + width,
        };

        existingRectangles.push(placedRect);

        foundTablePlacements.push({
          table,
          parsedTable,
          startRow: placedRect.startRow,
          startCol: placedRect.startCol,
        });
      } else {
        foundTablePlacements.push({
          table,
          parsedTable,
          startRow: 1,
          startCol: 1,
        });
      }
    }

    if (foundTablePlacements.length === 0) return dsl;

    foundTablePlacements.forEach(
      ({ table, parsedTable, startRow, startCol }) => {
        editLayoutDecorator(table, parsedTable, {
          targetRow: startRow,
          targetCol: startCol,
          showTableHeader: true,
          showFieldHeaders: true,
        });
      },
    );

    return editableSheet.toDSL();
  } catch (error) {
    return dsl;
  }
}

/**
 * Suggests a placement for a new table with predefined dimensions.
 * This is used for tables that haven't been added to the DSL yet.
 */
export function suggestTablePlacement(
  parsedSheet: ParsedSheet,
  tableStructures: GridTable[],
  grid: GridApi | null,
  projectName: string | null,
  sheetName: string | null,
  newWidth: number,
  newHeight: number,
): { row: number; col: number } | null {
  const placementCtx = initPlacementCtx(tableStructures);
  const existingRectangles = buildExistingRectangles(
    [],
    placementCtx,
    parsedSheet.tables,
    grid,
    projectName,
    sheetName,
  );

  const gridSizes = grid?.gridSizes;
  const maxCols = gridSizes?.edges.col ?? defaultGridSizes.edges.col;
  const maxRows = gridSizes?.edges.row ?? defaultGridSizes.edges.row;

  // Fast path
  const candidateRows = new Set<number>([1]);
  const candidateCols = new Set<number>([1]);
  for (const r of existingRectangles) {
    candidateRows.add(r.startRow);
    candidateRows.add(r.startRow + 1);
    candidateRows.add(r.endRow);
    candidateRows.add(r.endRow + 1);

    candidateCols.add(r.startCol);
    candidateCols.add(r.startCol + 1);
    candidateCols.add(r.endCol);
    candidateCols.add(r.endCol + 1);
  }

  const candidatePointCombinations: Array<{ row: number; col: number }> = [];
  for (const row of candidateRows) {
    if (row < 1 || row > maxRows) continue;
    for (const col of candidateCols) {
      if (col < 1 || col > maxCols) continue;
      candidatePointCombinations.push({ row, col });
    }
  }
  // Sort by Manhattan distance from origin (row + col), preferring top-left positions
  candidatePointCombinations.sort(
    (a, b) => a.row + a.col - (b.row + b.col) || a.row - b.row,
  );

  const testCandidatePosition = (
    row: number,
    col: number,
  ): { row: number; col: number } | null => {
    const endRow = row + newHeight;
    const endCol = col + newWidth;

    if (endRow > maxRows || endCol > maxCols) return null;

    const candidateRectangle: ExistingRect = {
      startRow: row,
      endRow,
      startCol: col,
      endCol,
    };

    return !intersectsAnyRect(existingRectangles, candidateRectangle)
      ? { row, col }
      : null;
  };

  for (const p of candidatePointCombinations) {
    const hit = testCandidatePosition(p.row, p.col);
    if (hit) return hit;
  }

  // Fallback: diagonal scan from top-left to bottom-right
  for (let sum = 2; sum <= maxRows + maxCols; sum++) {
    for (let row = 1; row < sum; row++) {
      const col = sum - row;
      if (row < 1 || row > maxRows || col < 1 || col > maxCols) continue;
      const hit = testCandidatePosition(row, col);
      if (hit) return hit;
    }
  }

  return null;
}

/**
 * Finds the nearest available position for a table using a two-phase search strategy
 */
function findNearestPlacement(
  existingRectangles: ExistingRect[],
  table: ParsedTable,
  placementCtx: PlacementCtx,
  grid: GridApi | null,
  projectName: string | null,
  sheetName: string | null,
): { row: number; col: number; width: number; height: number } | null {
  const gridSizes = grid?.gridSizes;
  const maxCols = gridSizes?.edges.col || defaultGridSizes.edges.col;
  const maxRows = gridSizes?.edges.row || defaultGridSizes.edges.row;

  // Fast path using stable candidate points
  const candidateRows = new Set<number>([1]);
  const candidateCols = new Set<number>([1]);

  for (const r of existingRectangles) {
    candidateRows.add(r.startRow);
    candidateRows.add(r.startRow + 1);
    candidateRows.add(r.endRow);
    candidateRows.add(r.endRow + 1);

    candidateCols.add(r.startCol);
    candidateCols.add(r.startCol + 1);
    candidateCols.add(r.endCol);
    candidateCols.add(r.endCol + 1);
  }

  const candidatePointCombinations: Array<{ row: number; col: number }> = [];
  for (const row of candidateRows) {
    if (row < 1 || row > maxRows) continue;
    for (const col of candidateCols) {
      if (col < 1 || col > maxCols) continue;
      candidatePointCombinations.push({ row, col });
    }
  }

  // Sort by Manhattan distance from origin (prioritize top-left positions)
  candidatePointCombinations.sort(
    (a, b) => a.row + a.col - (b.row + b.col) || a.row - b.row,
  );

  const seen = new Set<string>();
  const testCandidatePosition = ({
    row,
    col,
  }: {
    row: number;
    col: number;
  }) => {
    const key = `${row}:${col}`;
    if (seen.has(key)) return null;
    seen.add(key);

    const { width, height } = getTableDimensions(
      table,
      placementCtx,
      grid,
      projectName,
      sheetName,
      virtualDimTableRowsCount,
      col,
    );

    const endRow = row + height;
    const endCol = col + width;

    if (endRow > maxRows || endCol > maxCols) return null;

    const candidateRectangle: ExistingRect = {
      startRow: row,
      endRow,
      startCol: col,
      endCol,
    };

    // Check for collisions with existing tables
    if (!intersectsAnyRect(existingRectangles, candidateRectangle)) {
      return { row, col, width, height };
    }

    return null;
  };

  for (const point of candidatePointCombinations) {
    const hit = testCandidatePosition(point);
    if (hit) return hit;
  }

  // Fallback diagonal scan
  for (let sum = 2; sum <= maxRows + maxCols; sum++) {
    for (let row = 1; row < sum; row++) {
      const col = sum - row;

      if (row < 1 || row > maxRows || col < 1 || col > maxCols) continue;

      const { width, height } = getTableDimensions(
        table,
        placementCtx,
        grid,
        projectName,
        sheetName,
        virtualDimTableRowsCount,
        col,
      );

      const endRow = row + height;
      const endCol = col + width;

      if (endRow > maxRows || endCol > maxCols) continue;

      const candidateRectangle: ExistingRect = {
        startRow: row,
        endRow: endRow,
        startCol: col,
        endCol: endCol,
      };

      if (!intersectsAnyRect(existingRectangles, candidateRectangle)) {
        return { row, col, width, height };
      }
    }
  }

  return null;
}

/**
 * Builds a list of occupied rectangles representing all existing tables in the grid.
 *
 * Tables fall into three categories:
 * 1. Already rendered (in tableStructureByName): use actual grid dimensions
 * 2. Has placement but no data yet (tableWithPlacementWithoutData): calculate estimated dimensions
 * 3. No placement (emptyPlacementTables): excluded, as they're what we're trying to place
 *
 * Each rectangle includes a border margin to prevent visual collision between tables.
 */
function buildExistingRectangles(
  emptyPlacementTables: ParsedTable[],
  placementCtx: PlacementCtx,
  tables: ParsedTable[],
  grid: GridApi | null,
  projectName: string | null,
  sheetName: string | null,
): ExistingRect[] {
  const tableNamesSet = new Set(tables.map((t) => t.tableName));
  const emptyPlacementTablesSet = new Set(
    emptyPlacementTables.map((t) => t.tableName),
  );
  const tableStructuresSet = new Set(placementCtx.tableStructureMap.keys());
  const tableWithPlacementWithoutData = tables.filter(
    ({ tableName }) =>
      !emptyPlacementTablesSet.has(tableName) &&
      !tableStructuresSet.has(tableName),
  );

  const rectangles: ExistingRect[] = [];

  // Already rendered tables with known dimensions
  for (const t of placementCtx.tableStructureMap.values()) {
    if (!tableNamesSet.has(t.tableName)) continue;

    rectangles.push({
      startRow: t.startRow,
      endRow: t.endRow + borderMargin,
      startCol: t.startCol,
      endCol: t.endCol + borderMargin,
    });
  }

  // Tables with placement but not yet rendered
  for (const t of tableWithPlacementWithoutData) {
    const [, startCol] = t.getPlacement();
    const { width, height, startRow } = getTableDimensions(
      t,
      placementCtx,
      grid,
      projectName,
      sheetName,
      virtualDimTableRowsCount,
      startCol,
    );
    rectangles.push({
      startRow,
      endRow: startRow + height,
      startCol,
      endCol: startCol + width,
    });
  }

  return rectangles;
}
const moveTablesOutOfSpreadsheetEdges = (
  dsl: string,
  tables: ParsedTable[],
  editableSheet: Sheet,
): { dsl: string; hasChanges: boolean } => {
  try {
    const tablesWithWrongPlacement = tables.filter((t) => {
      if (!t.hasPlacement()) return false;

      const [row, col] = t.getPlacement();

      return row < 1 || col < 1;
    });

    if (tablesWithWrongPlacement.length === 0) {
      return { dsl, hasChanges: false };
    }

    tablesWithWrongPlacement.forEach((parsedTable) => {
      const [row, col] = parsedTable.getPlacement();
      const table = editableSheet.getTable(
        unescapeTableName(parsedTable.tableName),
      );

      editLayoutDecorator(table, parsedTable, {
        targetRow: Math.max(minTablePlacement, row),
        targetCol: Math.max(minTablePlacement, col),
      });
    });

    return { dsl: editableSheet.toDSL(), hasChanges: true };
  } catch (e) {
    return { dsl, hasChanges: false };
  }
};

function getExpandedTextSizeCached(
  placementCtx: PlacementCtx,
  {
    text,
    col,
    grid,
    projectName,
    sheetName,
    useMaxLimit,
  }: {
    text: string;
    col: number;
    grid: GridApi | null;
    projectName: string;
    sheetName: string;
    useMaxLimit?: boolean;
  },
): number | undefined {
  const cacheKey = `${projectName}|${sheetName}|${col}|${
    useMaxLimit ? 1 : 0
  }|${text}`;

  if (placementCtx.expandedTextSizeCache.has(cacheKey)) {
    return placementCtx.expandedTextSizeCache.get(cacheKey);
  }

  const textSize = getExpandedTextSize({
    text,
    col,
    grid,
    projectName,
    sheetName,
    useMaxLimit,
  });

  placementCtx.expandedTextSizeCache.set(cacheKey, textSize);

  return textSize;
}

function getColumnsCount(
  placementCtx: PlacementCtx,
  tableName: string,
  fields: ParsedField[],
  currentStartCol: number,
  grid: GridApi | null,
  projectName: string | null,
  sheetName: string | null,
): number {
  const cacheKey = `${tableName}|${currentStartCol}|${projectName ?? ''}|${
    sheetName ?? ''
  }`;
  const cached = placementCtx.columnsCountCache.get(cacheKey);
  if (cached !== undefined) return cached;

  // Fast path
  if (!projectName || !sheetName) {
    let sum = 0;
    for (let i = 0; i < fields.length; i++) sum += fields[i].getSize();
    placementCtx.columnsCountCache.set(cacheKey, sum);

    return sum;
  }

  // Calculate the total width needed for all fields
  let acc = 0;
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const sizeDecorator = field.getSize();

    if (sizeDecorator > 1) {
      acc += sizeDecorator;
      continue;
    }

    const fieldSize = getExpandedTextSizeCached(placementCtx, {
      text: field.key.fieldName,
      col: currentStartCol + acc,
      grid,
      projectName,
      sheetName,
    });

    acc += Math.max(sizeDecorator, fieldSize ?? 1);
  }

  const tableHeaderSize = getExpandedTextSizeCached(placementCtx, {
    text: tableName,
    col: currentStartCol,
    grid,
    projectName,
    sheetName,
    useMaxLimit: true,
  });

  if (tableHeaderSize === undefined) {
    placementCtx.columnsCountCache.set(cacheKey, acc);

    return acc;
  }

  const maxAllowedHeaderSize = fields.length * fieldNameSizeLimit;
  const shouldUseHeaderWidth =
    tableHeaderSize > acc && tableHeaderSize <= maxAllowedHeaderSize;
  const totalColumnsCount = shouldUseHeaderWidth ? tableHeaderSize : acc;

  placementCtx.columnsCountCache.set(cacheKey, totalColumnsCount);

  return totalColumnsCount;
}

/**
 * This method is similar to the GridBuilder one, but:
 * 1. If the table contains data, return the calculated dimensions immediately.
 * 2. If the table does not contain data, is manual, or has no dimensions, use the override rows to calculate total rows.
 * 3. If the table does not contain data but does have dimensions, use a 1 row.
 * Count table headers and field headers as visible.
 */
function getTableDimensions(
  table: ParsedTable,
  placementCtx: PlacementCtx,
  grid: GridApi | null,
  projectName: string | null,
  sheetName: string | null,
  maxRows = 1,
  dynamicPlacementStartCol = 1,
): TableDimension {
  const cacheKey = `${table.tableName}|${dynamicPlacementStartCol}|${maxRows}|${
    projectName ?? ''
  }|${sheetName ?? ''}`;
  const cached = placementCtx.tableDimensionsCache.get(cacheKey);
  if (cached) return cached;

  const tableStructure = placementCtx.tableStructureMap.get(table.tableName);
  if (tableStructure) {
    const { startCol, startRow, endCol, endRow } = tableStructure;
    const res = {
      width: endCol - startCol + 1,
      height: endRow - startRow + 1,
      startRow,
      startCol,
    };
    placementCtx.tableDimensionsCache.set(cacheKey, res);

    return res;
  }

  const { fields } = table;
  const [startRow, startCol] = table.getPlacement();
  const totalSize = table.getTotalSize();
  const isTableHorizontal = table.getIsTableDirectionHorizontal();

  // Fixed dimensions for charts
  if (table.isChart()) {
    const chartSize = table.getChartSize();
    const chartRows = chartSize[0] || defaultChartRows;
    const chartCols = chartSize[1] || defaultChartCols;
    const res = { width: chartCols, height: chartRows, startRow, startCol };
    placementCtx.tableDimensionsCache.set(cacheKey, res);

    return res;
  }

  const columnsCount = getColumnsCount(
    placementCtx,
    table.tableName,
    fields,
    dynamicPlacementStartCol,
    grid,
    projectName,
    sheetName,
  );

  const isSimpleTable = table.isManual() || fields.every((f) => !f.isDim);
  const overridesSize = table.overrides?.getSize() || 1;

  if (isTableHorizontal) {
    const fieldHeadersWidth = 1;
    const tableHeaderHeight = 1;
    const colsCount = isSimpleTable ? overridesSize : maxRows;
    const endCol = colsCount + startCol + totalSize + fieldHeadersWidth - 1;

    const endRow = startRow + tableHeaderHeight + columnsCount - 1;
    const res = {
      width: endCol - startCol + 1,
      height: endRow - startRow + 1,
      startRow,
      startCol,
    };
    placementCtx.tableDimensionsCache.set(cacheKey, res);

    return res;
  }

  const tableHeadersHeight = 2;
  const rowsCount = isSimpleTable ? overridesSize : maxRows;
  const endRow = rowsCount + startRow + totalSize + tableHeadersHeight - 1;

  const endCol = columnsCount > 0 ? startCol + columnsCount - 1 : startCol;
  const res = {
    width: endCol - startCol + 1,
    height: endRow - startRow + 1,
    startRow,
    startCol,
  };
  placementCtx.tableDimensionsCache.set(cacheKey, res);

  return res;
}

function rectsIntersect(r1: ExistingRect, r2: ExistingRect): boolean {
  return !(
    r1.endRow < r2.startRow ||
    r1.startRow > r2.endRow ||
    r1.endCol < r2.startCol ||
    r1.startCol > r2.endCol
  );
}

function intersectsAnyRect(
  existing: ExistingRect[],
  candidate: ExistingRect,
): boolean {
  for (const rect of existing) {
    if (rectsIntersect(rect, candidate)) return true;
  }

  return false;
}

function initPlacementCtx(tableStructures: GridTable[]): PlacementCtx {
  return {
    tableStructureMap: new Map(tableStructures.map((t) => [t.tableName, t])),
    expandedTextSizeCache: new Map(),
    columnsCountCache: new Map(),
    tableDimensionsCache: new Map(),
  };
}
