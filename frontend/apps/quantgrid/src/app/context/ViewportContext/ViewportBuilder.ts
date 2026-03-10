import { ChartType, GridViewport, Viewport } from '@frontend/common';
import {
  dynamicFieldName,
  ParsedTable,
  unescapeTableName,
} from '@frontend/parser';

import { getExtendedRoundedBorders } from './getExtendedRoundedBorders';
import { getTableFieldsForViewport } from './getTableFieldsForViewport';
import {
  DynamicColumnRange,
  extraDirectionOffset,
  Range,
  TableFieldsPlan,
  TableViewportCache,
  ViewportWithColumnRange,
} from './types';
import { ViewGridData } from './ViewGridData';

const minCoordinate = 0;
const bootstrapRowCount = 1; // Number of rows to fetch for dynamic field discovery

/**
 * ViewportBuilder generates viewport requests for data fetching with caching.
 *
 * Key responsibilities:
 * - Converts grid viewport coordinates to table-specific data requests
 * - Manages caching to avoid redundant data fetching
 * - Handles dynamic columns ('*' fields) with separate column-range caching
 * - Supports both horizontal and vertical table orientations
 * - Handles special cases like charts and bootstrap requests for dynamic field discovery
 *
 * Caching strategy:
 * - Tracks requested row ranges per table to avoid re-fetching
 * - Tracks requested fields to detect when new columns become visible
 * - Tracks dynamic column ranges separately for '*' fields
 * - Automatically invalidates cache when total rows change
 */
export class ViewportBuilder {
  protected viewGridData: ViewGridData;

  /** Cache of previously requested viewports per table */
  protected cachedViewports: Record<string, TableViewportCache>;

  constructor(viewGridData: ViewGridData) {
    this.viewGridData = viewGridData;
    this.cachedViewports = {};
  }

  /**
   * Builds viewport requests for all tables intersecting the current viewport.
   *
   * Algorithm:
   * 1. Extends and rounds viewport boundaries for better caching
   * 2. For each table, converts global coordinates to table-local coordinates
   * 3. Compares with cached requests to determine what data is missing
   * 4. Generates minimal requests for only the missing data
   * 5. Updates cache to track what has been requested
   *
   * Special cases:
   * - Tables outside the viewport may still generate requests if they need dynamic field discovery
   * - Charts request minimal rows (0 to 0) for metadata
   * - Horizontal tables swap row/column semantics (primary axis = columns)
   *
   * @param viewport - The current grid viewport (global coordinates)
   * @returns Array of viewport requests to fetch missing data
   *
   * Note: Row ranges are half-open intervals [start, end].
   * Note: Dynamic columns are cached separately with [start_column, end_column] ranges.
   */
  public buildViewportRequest(viewport: GridViewport): Viewport[] {
    const tablesData = this.viewGridData.getTablesData();
    const viewports: Viewport[] = [];

    // Extend and round viewport boundaries for better cache efficiency
    const [start_row, end_row] = getExtendedRoundedBorders(
      Math.max(minCoordinate, viewport.startRow),
      viewport.endRow,
    );
    const [start_col, end_col] = getExtendedRoundedBorders(
      Math.max(minCoordinate, viewport.startCol),
      viewport.endCol,
    );

    for (const tableData of tablesData) {
      const {
        table,
        dynamicFields,
        isDynamicFieldsRequested,
        totalRows,
        isTotalRowsUpdated,
      } = tableData;
      const { tableName: escapedTableName } = table;

      const tableName = unescapeTableName(escapedTableName);

      const isTableHorizontal = table.getIsTableDirectionHorizontal();
      const chartType = table.getChartType();
      const isRegularChartTable =
        !!chartType && chartType !== ChartType.PERIOD_SERIES;

      const [tableStartRow, tableStartCol] = table.getPlacement();

      // Convert global viewport coordinates to table-local coordinates
      // Note: "Row" in requests refers to the table's primary axis:
      // - For vertical tables: primary axis = rows
      // - For horizontal tables: primary axis = columns
      const startDirectionValue = isTableHorizontal ? start_col : start_row;
      const endDirectionValue = isTableHorizontal ? end_col : end_row;
      const tableStart = isTableHorizontal ? tableStartCol : tableStartRow;

      // Normalize to table-local coordinates (0-based relative to table start)
      let normalizedStartRow = Math.max(
        minCoordinate,
        startDirectionValue - tableStart,
      );
      let normalizedEndRow = Math.max(
        normalizedStartRow,
        endDirectionValue - tableStart,
      );

      // Clamp row range to actual table size if known
      // Prevents requesting data beyond table boundaries
      if (isTotalRowsUpdated && totalRows > 0) {
        const maxEndExclusive = totalRows;
        normalizedStartRow = Math.min(normalizedStartRow, maxEndExclusive);
        normalizedEndRow = Math.min(normalizedEndRow, maxEndExclusive);
      }

      let rowsNeeded: Range | undefined = this.normalizeRange(
        normalizedStartRow,
        normalizedEndRow,
      );
      let isDynamicBootstrap = false;
      let plan: TableFieldsPlan | undefined;

      if (rowsNeeded) {
        // Table is visible: plan which fields are needed based on viewport
        plan = this.getFieldsPlan(
          viewport,
          table,
          dynamicFields ?? [],
          isDynamicFieldsRequested,
        );
      } else if (table.hasDynamicFields() && !isDynamicFieldsRequested) {
        // Special case: Table is offscreen but has dynamic fields ('*') that haven't been discovered yet.
        // We need to make a minimal "bootstrap" request to discover what columns exist.
        const candidatePlan = this.getFieldsPlan(
          viewport,
          table,
          dynamicFields ?? [],
          isDynamicFieldsRequested,
        );

        if (candidatePlan.fields.includes(dynamicFieldName)) {
          // Request just 1 row to discover dynamic column names
          const bootstrapEndExclusive =
            isTotalRowsUpdated && totalRows > 0
              ? Math.min(bootstrapRowCount, totalRows)
              : bootstrapRowCount;

          const bootstrapRows = this.normalizeRange(0, bootstrapEndExclusive);
          if (!bootstrapRows) continue;

          rowsNeeded = bootstrapRows;
          normalizedStartRow = bootstrapRows[0];
          normalizedEndRow = bootstrapRows[1];

          // Only request the '*' field for bootstrap
          plan = {
            fields: [dynamicFieldName],
            dynamicRange: candidatePlan.dynamicRange,
          };

          isDynamicBootstrap = true;
        } else {
          // No dynamic fields or already requested, skip this table
          continue;
        }
      } else {
        // Table not visible and no bootstrap needed
        continue;
      }

      if (!plan || plan.fields.length === 0) continue;

      // Determine dynamic column range if the '*' field is requested
      const desiredDynamicRange: DynamicColumnRange | undefined =
        plan.fields.includes(dynamicFieldName)
          ? (plan.dynamicRange ??
            this.computeDynamicColumnRange(
              viewport,
              table,
              dynamicFields?.length ?? 0,
            ))
          : undefined;

      // Retrieve cached viewport data for this table
      const cache = this.cachedViewports[tableName];

      // Adjust cached row ranges if total rows changed (table size decreased)
      // This prevents using stale cache entries that reference rows beyond the new table size
      const cachedRows =
        isTotalRowsUpdated && totalRows > 0
          ? (cache?.requestedRows ?? [])
              .map(
                ([s, e]) =>
                  [Math.min(s, totalRows), Math.min(e, totalRows)] as Range,
              )
              .filter(([s, e]) => e > s) // Remove invalidated ranges
          : (cache?.requestedRows ?? []);
      const cachedFields = cache?.fields ?? new Set<string>();
      const cachedDynamicColumns = cache?.requestedDynamicColumns ?? [];

      // Compute which row ranges are missing from the cache
      const missingRowRanges = this.subtractRange(rowsNeeded, cachedRows);

      // Check if new fields became visible that weren't in the cache
      const updatedFields = new Set<string>([...cachedFields, ...plan.fields]);
      const hasNewFields = updatedFields.size !== cachedFields.size;

      // Determine row ranges to request:
      // - If rows are missing: request those ranges with all visible fields
      // - If new fields appeared but rows cached: request all rows again but only for new fields
      let forcedByFields = false;
      let rowRangesToRequest: Range[] = missingRowRanges;

      if (hasNewFields && missingRowRanges.length === 0) {
        // All rows cached, but new columns visible: re-request with new fields only
        rowRangesToRequest = [rowsNeeded];
        forcedByFields = true;
      }

      // Handle dynamic column range caching for '*' fields
      // Dynamic columns can expand independently of row scrolling
      let dynamicColumnRangesToRequest: Range[] = [];
      let updatedDynamicColumns = cachedDynamicColumns;
      const desiredDynamicRangeAsRange: Range | undefined = desiredDynamicRange
        ? [desiredDynamicRange.start, desiredDynamicRange.end]
        : undefined;
      const shouldRequestStarForDesiredRange =
        !!desiredDynamicRangeAsRange &&
        this.subtractRange(desiredDynamicRangeAsRange, cachedDynamicColumns)
          .length > 0;

      if (desiredDynamicRange) {
        const desired: Range = [
          desiredDynamicRange.start,
          desiredDynamicRange.end,
        ];

        if (rowRangesToRequest.length === 0) {
          // No row requests needed: check if we need to fetch new dynamic columns
          // This happens during horizontal scrolling when rows are already cached
          dynamicColumnRangesToRequest = this.subtractRange(
            desired,
            cachedDynamicColumns,
          );

          if (dynamicColumnRangesToRequest.length > 0) {
            updatedDynamicColumns = this.mergeRanges([
              ...cachedDynamicColumns,
              ...dynamicColumnRangesToRequest,
            ]);
          }
        } else {
          // Row requests will include dynamic columns ONLY if we actually include '*' in fieldsForRowRanges.
          // Do not mark the desired as cached unless we will request it.
          if (shouldRequestStarForDesiredRange) {
            updatedDynamicColumns = this.mergeRanges([
              ...cachedDynamicColumns,
              desired,
            ]);
          } else {
            updatedDynamicColumns = cachedDynamicColumns;
          }
        }
      }

      // Skip if nothing new to request (all data already cached)
      const hasRowsToRequest = rowRangesToRequest.length > 0;
      const hasDynamicColumnsToRequest =
        dynamicColumnRangesToRequest.length > 0;
      const hasAnythingToRequest =
        hasRowsToRequest || hasDynamicColumnsToRequest || hasNewFields;

      if (!hasAnythingToRequest) continue;

      // Update cache with new requests
      this.cachedViewports[tableName] = {
        startRow: rowsNeeded[0],
        endRow: rowsNeeded[1],
        requestedRows: this.mergeRanges([...cachedRows, ...rowRangesToRequest]),
        fields: updatedFields,
        requestedDynamicColumns: updatedDynamicColumns,
      };

      // Determine which fields to include in row-based requests:
      // - Missing rows: fetch all visible fields to populate the data completely
      // - Cached rows but new fields: fetch only the new fields to avoid redundant data transfer
      const fieldsForRowRanges = forcedByFields
        ? plan.fields.filter((f) => {
            if (f === dynamicFieldName) return shouldRequestStarForDesiredRange;

            return !cachedFields.has(f);
          })
        : plan.fields;

      // Generate viewport requests for missing row ranges
      for (const [rowStart, rowEnd] of rowRangesToRequest) {
        for (const field of fieldsForRowRanges) {
          // Special case: Regular charts (non-period-series) request minimal rows for metadata
          const isChartMetadataRequest =
            isRegularChartTable && field !== dynamicFieldName;

          const vp: ViewportWithColumnRange = {
            start_row: isChartMetadataRequest ? 0 : rowStart,
            end_row: isChartMetadataRequest ? 0 : rowEnd,
            fieldKey: { field, table: tableName },
            is_raw: true,
          };

          // Add column range for dynamic fields
          if (field === dynamicFieldName && desiredDynamicRange) {
            vp.start_column = desiredDynamicRange.start;
            vp.end_column = desiredDynamicRange.end;
          }

          viewports.push(vp);
        }
      }

      // Generate viewport requests for new dynamic column ranges only
      // This happens when scrolling horizontally while rows are already cached
      if (dynamicColumnRangesToRequest.length > 0) {
        for (const [colStart, colEnd] of dynamicColumnRangesToRequest) {
          const vp: ViewportWithColumnRange = {
            start_row: normalizedStartRow,
            end_row: normalizedEndRow,
            fieldKey: { field: dynamicFieldName, table: tableName },
            is_raw: true,
            start_column: colStart,
            end_column: colEnd,
          };

          viewports.push(vp);
        }
      }

      // Add total row requests if the table has totals defined
      // Skip for bootstrap requests as they're only for discovering field names
      if (!isDynamicBootstrap && table.total && hasRowsToRequest) {
        for (const field of fieldsForRowRanges) {
          const fieldTotal = table.total.getFieldTotal(field);
          if (!fieldTotal) continue;

          for (const index of Object.keys(fieldTotal)) {
            viewports.push({
              start_row: 0,
              end_row: 1,
              totalKey: {
                field,
                table: tableName,
                number: parseInt(index, 10),
              },
              is_raw: true,
            });
          }
        }
      }
    }

    return viewports;
  }

  /**
   * Determines which fields should be included in the viewport request based on what's visible.
   *
   * @param viewport - The current grid viewport
   * @param table - The table being processed
   * @param dynamicFields - Already discovered dynamic field names
   * @param isDynamicFieldsRequested - Whether dynamic fields have been requested before
   * @returns Object containing fields to request and optional dynamic column range
   */
  private getFieldsPlan(
    viewport: GridViewport,
    table: ParsedTable,
    dynamicFields: (string | undefined)[],
    isDynamicFieldsRequested: boolean,
  ): TableFieldsPlan {
    const result = getTableFieldsForViewport(
      viewport,
      table,
      dynamicFields,
      isDynamicFieldsRequested,
    );

    if (Array.isArray(result)) {
      return { fields: result };
    }

    if (result && Array.isArray(result.fields)) {
      return {
        fields: result.fields,
        dynamicRange: result.dynamicRange,
      };
    }

    // Fallback: no fields to request
    return { fields: [] };
  }

  /**
   * Computes the dynamic column range for '*' fields based on viewport visibility.
   *
   * This method calculates which dynamic columns are visible in the current viewport
   * and returns their indices relative to the start of the dynamic block.
   *
   * @param viewport - The current grid viewport
   * @param table - The table containing dynamic fields
   * @param dynamicTotal - Total number of discovered dynamic columns
   * @returns Column range {start, end} or undefined if no dynamic fields are visible
   */
  private computeDynamicColumnRange(
    viewport: GridViewport,
    table: ParsedTable,
    dynamicTotal: number,
  ): DynamicColumnRange | undefined {
    if (!table.hasDynamicFields()) return undefined;

    const dynamicBlockStartIndex = table.getDynamicBlockStartIndex();

    if (dynamicBlockStartIndex < 0) return undefined;

    const [tableStartRow, tableStartCol] = table.getPlacement();
    const isTableHorizontal = table.getIsTableDirectionHorizontal();

    // Dynamic fields are laid out along the secondary axis.
    const fieldAxisStart = isTableHorizontal ? tableStartRow : tableStartCol;
    const viewportFieldStart = isTableHorizontal
      ? viewport.startRow
      : viewport.startCol;
    const viewportFieldEnd = isTableHorizontal
      ? viewport.endRow
      : viewport.endCol;

    const visibleStart = Math.max(0, viewportFieldStart - extraDirectionOffset);
    const visibleEnd = viewportFieldEnd + extraDirectionOffset;

    const dynamicStartCoord = fieldAxisStart + dynamicBlockStartIndex;
    const dynamicEndCoord =
      dynamicTotal > 0
        ? dynamicStartCoord + dynamicTotal
        : Number.POSITIVE_INFINITY;

    const overlapStart = Math.max(visibleStart, dynamicStartCoord);
    const overlapEnd = Math.min(visibleEnd, dynamicEndCoord);

    if (overlapEnd <= overlapStart) return undefined;

    const start = Math.max(0, overlapStart - dynamicStartCoord);
    const end = Math.max(start + 1, overlapEnd - dynamicStartCoord);

    return { start, end };
  }

  /**
   * Normalizes a coordinate range to ensure it's valid and non-empty.
   *
   * @param start - Range start (inclusive)
   * @param end - Range end (exclusive)
   * @returns Normalized [start, end] range or undefined if invalid
   */
  private normalizeRange(start: number, end: number): Range | undefined {
    const s = Math.max(0, Math.floor(start));
    const e = Math.max(0, Math.floor(end));

    if (e <= s) return undefined;

    return [s, e];
  }

  /**
   * Computes the portions of a required range that are not covered by existing ranges.
   *
   * This is used to determine what data needs to be fetched based on what's already cached.
   * The algorithm merges overlapping covered ranges first, then finds gaps.
   *
   * @param need - The range we need data for [start, end]
   * @param covered - Array of ranges we already have cached
   * @returns Array of ranges representing the missing portions
   */
  private subtractRange(need: Range, covered: Range[] = []): Range[] {
    const [needStart, needEnd] = need;

    if (needEnd <= needStart) return [];
    if (!covered || covered.length === 0) return [[needStart, needEnd]];

    const merged = this.mergeRanges(covered);

    const missing: Range[] = [];
    let cursor = needStart;

    for (const [s, e] of merged) {
      if (e <= needStart) continue;
      if (s >= needEnd) break;

      const cs = Math.max(s, needStart);
      const ce = Math.min(e, needEnd);

      if (cs > cursor) {
        missing.push([cursor, cs]);
      }

      cursor = Math.max(cursor, ce);
    }

    if (cursor < needEnd) {
      missing.push([cursor, needEnd]);
    }

    return missing;
  }

  /**
   * Merges overlapping and adjacent ranges into a minimal non-overlapping set.
   *
   * This optimizes cache storage by consolidating fragmented ranges into
   * contiguous blocks. Adjacent ranges (e.g., [0,10] and [10,20]) are merged.
   *
   * @param ranges - Array of ranges to merge
   * @returns Sorted array of non-overlapping ranges
   */
  private mergeRanges(ranges: Range[] = []): Range[] {
    const normalized = (ranges || []).filter(([s, e]) => e > s);
    if (normalized.length === 0) return [];

    const sorted = [...normalized].sort(
      ([aStart], [bStart]) => aStart - bStart,
    );

    const merged: Range[] = [];
    let [curStart, curEnd] = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const [nextStart, nextEnd] = sorted[i];

      if (nextStart <= curEnd) {
        curEnd = Math.max(curEnd, nextEnd);
      } else {
        merged.push([curStart, curEnd]);
        curStart = nextStart;
        curEnd = nextEnd;
      }
    }

    merged.push([curStart, curEnd]);

    return merged;
  }

  /**
   * Invalidates cached viewport data for a specific table or all tables.
   * @param tableName - The name of the table to invalidate cache for. If omitted, clears all caches.
   */
  public invalidate(tableName?: string): void {
    if (!tableName) {
      this.cachedViewports = {};

      return;
    }

    delete this.cachedViewports[tableName];
  }

  /**
   * Clears all cached viewport data.
   */
  clear() {
    this.cachedViewports = {};
  }
}
