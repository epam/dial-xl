import { defaultGridSizes, GridApi } from '@frontend/canvas-spreadsheet';
import {
  defaultChartCols,
  defaultChartRows,
  GridTable,
} from '@frontend/common';
import {
  layoutDecoratorName,
  lineBreak,
  minTablePlacement,
  ParsedField,
  ParsedTable,
  SheetReader,
  updateLayoutDecorator,
} from '@frontend/parser';

import { fieldNameSizeLimit, getExpandedTextSize } from '../utils';

interface ExistingRect {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

interface PlacedTable {
  tableName: string;
  startRow: number;
  startCol: number;
  dslOffset: number;
}

const borderMargin = 1;
const virtualDimTableRowsCount = 100;

/**
 * Automatically places tables within the spreadsheet, avoiding collisions
 * and ensuring valid row/column bounds.
 *
 * @param dsl The DSL string describing the sheet.
 * @param tableStructures A list of grid table structures.
 * @param grid The grid API instance or null.
 * @param projectName The project name or null.
 * @param sheetName The sheet name or null.
 * @returns An updated DSL string containing table placements.
 */
export function autoTablePlacement(
  dsl: string,
  tableStructures: GridTable[],
  grid: GridApi | null,
  projectName: string | null,
  sheetName: string | null
): string {
  try {
    let parsedSheet = SheetReader.parseSheet(dsl);

    if (parsedSheet.errors.length > 0) return dsl;

    dsl = moveTablesOutOfSpreadsheetEdges(dsl, parsedSheet.tables);

    parsedSheet = SheetReader.parseSheet(dsl);

    const { tables } = parsedSheet;
    const emptyPlacementTables = tables.filter((t) => !t.hasPlacement());

    if (emptyPlacementTables.length === 0) return dsl;

    const existingRectangles = buildExistingRectangles(
      emptyPlacementTables,
      tableStructures,
      tables,
      grid,
      projectName,
      sheetName
    );

    const results: PlacedTable[] = [];
    for (const table of emptyPlacementTables) {
      const { dslPlacement, tableName, note } = table;
      if (!dslPlacement) continue;

      const foundPlacement = findNearestPlacement(
        existingRectangles,
        table,
        tableStructures,
        grid,
        projectName,
        sheetName
      );

      const dslOffset = Math.max(
        dslPlacement.startOffset,
        note?.end ?? dslPlacement.startOffset
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

        results.push({
          tableName,
          startRow: placedRect.startRow,
          startCol: placedRect.startCol,
          dslOffset,
        });
      } else {
        // Fallback if no placement found in the entire grid
        results.push({
          tableName,
          dslOffset,
          startRow: 1,
          startCol: 1,
        });
      }
    }

    if (results.length === 0) return dsl;

    let updatedDsl = dsl;
    const reversedTablesByPlacement = results.sort((a, b) => {
      return b.dslOffset - a.dslOffset;
    });
    reversedTablesByPlacement.forEach(({ dslOffset, startRow, startCol }) => {
      updatedDsl =
        updatedDsl.substring(0, dslOffset).trimEnd() +
        lineBreak +
        lineBreak +
        updateLayoutDecorator(undefined, {
          col: startCol,
          row: startRow,
          showFieldHeaders: true,
          showTableHeader: true,
        }) +
        lineBreak +
        updatedDsl.substring(dslOffset).trimStart();
    });

    return updatedDsl;
  } catch (error) {
    return dsl;
  }
}

/**
 * Simple bounding box intersection check for axis-aligned rectangles.
 */
function intersects(r1: ExistingRect, r2: ExistingRect): boolean {
  return !(
    r1.endRow < r2.startRow ||
    r1.startRow > r2.endRow ||
    r1.endCol < r2.startCol ||
    r1.startCol > r2.endCol
  );
}

/**
 * Returns true if 'candidate' intersects ANY of the rects in 'existing'.
 */
function intersectsAny(
  existing: ExistingRect[],
  candidate: ExistingRect
): boolean {
  for (const rect of existing) {
    if (intersects(rect, candidate)) return true;
  }

  return false;
}

/**
 * Searches from the top-left corner outward (diagonals in ascending order of row+col)
 * for a free rectangle of size height x width.  If found, returns {row, col}; else null.
 */
function findNearestPlacement(
  existingRectangles: ExistingRect[],
  table: ParsedTable,
  tableStructures: GridTable[],
  grid: GridApi | null,
  projectName: string | null,
  sheetName: string | null
): { row: number; col: number; width: number; height: number } | null {
  const gridSizes = grid?.getGridSizes();
  const maxCols = gridSizes?.edges.col || defaultGridSizes.edges.col;
  const maxRows = gridSizes?.edges.row || defaultGridSizes.edges.row;

  // The smallest sum is 2 (row=1,col=1). The largest is maxRows + maxCols.
  for (let sum = 2; sum <= maxRows + maxCols; sum++) {
    // Iterate row from 1...(sum-1).  col = sum - row.
    for (let row = 1; row < sum; row++) {
      const col = sum - row;

      // Must be in-bounds
      if (row < 1 || row > maxRows || col < 1 || col > maxCols) continue;

      const { width, height } = getTableDimensions(
        table,
        tableStructures,
        grid,
        projectName,
        sheetName,
        virtualDimTableRowsCount,
        col
      );

      const endRow = row + height;
      const endCol = col + width;

      // Check if the table extends out of grid bounds
      if (endRow > maxRows || endCol > maxCols) continue;

      // Form the candidate rectangle
      const candidate = {
        startRow: row,
        endRow: endRow,
        startCol: col,
        endCol: endCol,
      };

      // Check intersections
      if (!intersectsAny(existingRectangles, candidate)) {
        // Found a free spot
        return { row, col, width, height };
      }
    }
  }

  // Could not find a spot
  return null;
}

function buildExistingRectangles(
  emptyPlacementTables: ParsedTable[],
  tableStructures: GridTable[],
  tables: ParsedTable[],
  grid: GridApi | null,
  projectName: string | null,
  sheetName: string | null
): ExistingRect[] {
  const tableNamesSet = new Set(tables.map((t) => t.tableName));
  const emptyPlacementTablesSet = new Set(
    emptyPlacementTables.map((t) => t.tableName)
  );
  const tableStructuresSet = new Set(tableStructures.map((t) => t.tableName));
  const tableWithPlacementWithoutData = tables.filter(
    ({ tableName }) =>
      !emptyPlacementTablesSet.has(tableName) &&
      !tableStructuresSet.has(tableName)
  );

  const rectangles: ExistingRect[] = [];
  for (const t of tableStructures) {
    if (!tableNamesSet.has(t.tableName)) continue;

    rectangles.push({
      startRow: t.startRow,
      endRow: t.endRow + borderMargin,
      startCol: t.startCol,
      endCol: t.endCol + borderMargin,
    });
  }
  for (const t of tableWithPlacementWithoutData) {
    const { width, height, startCol, startRow } = getTableDimensions(
      t,
      tableStructures,
      grid,
      projectName,
      sheetName,
      virtualDimTableRowsCount
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
  tables: ParsedTable[]
) => {
  const tablesWithWrongPlacement = tables.filter((t) => {
    if (!t.hasPlacement()) return false;

    const [row, col] = t.getPlacement();

    return row < 1 || col < 1;
  });

  if (tablesWithWrongPlacement.length === 0) return dsl;

  const reversedTablesByPlacement = tablesWithWrongPlacement.sort((a, b) => {
    const bStartOffset = b.dslPlacement?.startOffset || 0;
    const aStartOffset = a.dslPlacement?.startOffset || 0;

    return bStartOffset - aStartOffset;
  });

  reversedTablesByPlacement.forEach((t) => {
    const [row, col] = t.getPlacement();

    const layoutDecorator = t.decorators.find(
      ({ decoratorName }) => decoratorName === layoutDecoratorName
    );

    const placementDsl = updateLayoutDecorator(layoutDecorator, {
      col: Math.max(minTablePlacement, col),
      row: Math.max(minTablePlacement, row),
    });

    if (layoutDecorator?.dslPlacement) {
      const { start, end } = layoutDecorator.dslPlacement;

      dsl =
        dsl.substring(0, start) +
        placementDsl +
        lineBreak +
        dsl.substring(end).trimStart();
    }
  });

  return dsl;
};

/**
 * Calculates the number of columns for a new table.
 * If grid, projectName and sheetName are provided, it calculates expanded field size.
 */
function getColumnsCount(
  tableName: string,
  fields: ParsedField[],
  currentStartCol: number,
  grid: GridApi | null,
  projectName: string | null,
  sheetName: string | null
): number {
  if (!projectName || !sheetName) {
    return fields.reduce((acc, field) => {
      return acc + field.getSize();
    }, 0);
  }

  const fieldSizes = fields.reduce((acc, field) => {
    const fieldSize = getExpandedTextSize({
      text: field.key.fieldName,
      col: currentStartCol + acc,
      grid,
      projectName,
      sheetName,
    });
    const sizeDecorator = field.getSize();
    acc += Math.max(sizeDecorator, fieldSize ?? 1);

    return acc;
  }, 0);

  const tableHeaderSize = getExpandedTextSize({
    text: tableName,
    col: currentStartCol,
    grid,
    projectName,
    sheetName,
    useMaxLimit: true,
  });

  if (tableHeaderSize === undefined) return fieldSizes;

  const maxFieldSizes = fields.length * fieldNameSizeLimit;

  return tableHeaderSize > fieldSizes && maxFieldSizes >= tableHeaderSize
    ? tableHeaderSize
    : fieldSizes;
}

// This method is similar to the GridBuilder one, but:
// 1. If the table contains data, return the calculated dimensions immediately.
// 2. If the table does not contain data, is manual, or has no dimensions, use the override rows to calculate total rows.
// 3. If the table does not contain data but does have dimensions, use a 1 row.
// Count table headers and field headers as visible.
function getTableDimensions(
  table: ParsedTable,
  tableStructures: GridTable[],
  grid: GridApi | null,
  projectName: string | null,
  sheetName: string | null,
  maxRows = 1,
  dynamicPlacementStartCol = 1
) {
  const tableStructure = tableStructures.find(
    (t) => t.tableName === table.tableName
  );

  if (tableStructure) {
    const { startCol, startRow, endCol, endRow } = tableStructure;

    return {
      width: endCol - startCol + 1,
      height: endRow - startRow + 1,
      startRow,
      startCol,
    };
  }

  const { fields } = table;
  const [startRow, startCol] = table.getPlacement();
  const totalSize = table.getTotalSize();
  const isTableHorizontal = table.getIsTableDirectionHorizontal();

  if (table.isChart()) {
    const chartSize = table.getChartSize();
    const chartRows = chartSize[0] || defaultChartRows;
    const chartCols = chartSize[1] || defaultChartCols;

    return { width: chartCols, height: chartRows, startRow, startCol };
  }

  const columnsCount = getColumnsCount(
    table.tableName,
    fields,
    dynamicPlacementStartCol,
    grid,
    projectName,
    sheetName
  );
  const isSimpleTable = table.isManual() || fields.every((f) => !f.isDim);
  const overridesSize = table.overrides?.getSize() || 1;

  if (isTableHorizontal) {
    const fieldHeadersWidth = 1;
    const tableHeaderHeight = 1;
    const endCol =
      (isSimpleTable ? overridesSize : maxRows) +
      startCol +
      totalSize +
      fieldHeadersWidth -
      1;

    const endRow = startRow + tableHeaderHeight + columnsCount - 1;

    return {
      width: endCol - startCol + 1,
      height: endRow - startRow + 1,
      startRow,
      startCol,
    };
  }

  const tableHeadersHeight = 2;
  const endRow =
    (isSimpleTable ? overridesSize : maxRows) +
    startRow +
    totalSize +
    tableHeadersHeight -
    1;

  const endCol = columnsCount > 0 ? startCol + columnsCount - 1 : startCol;

  return {
    width: endCol - startCol + 1,
    height: endRow - startRow + 1,
    startRow,
    startCol,
  };
}
