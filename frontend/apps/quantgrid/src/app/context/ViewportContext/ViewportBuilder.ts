import {
  CachedViewports,
  ColumnDataType,
  GridViewport,
  SelectedChartKey,
  unescapeTableName,
  Viewport,
} from '@frontend/common';

import { getExtendedRoundedBorders } from './getExtendedRoundedBorders';
import { getTableFieldsForViewport } from './getTableFieldsForViewport';
import { chunkSize, ViewGridData } from './ViewGridData';

/**
 * Class which is generating viewports request considering tablesData
 */
export class ViewportBuilder {
  protected viewGridData: ViewGridData;

  protected cachedViewports: CachedViewports;

  constructor(viewGridData: ViewGridData) {
    this.viewGridData = viewGridData;

    this.cachedViewports = {};
  }

  /**
   * Collects necessary data from tables to create viewport request, caching requested viewport
   * @returns {Viewport[]} Viewport request information (start_row, end_row, field name, tableName)
   */
  public buildViewportRequest(viewport: GridViewport): Viewport[] {
    const tablesData = this.viewGridData.getTablesData();
    const viewports: Viewport[] = [];

    const [start_row, end_row] = getExtendedRoundedBorders(
      Math.max(0, viewport.startRow),
      viewport.endRow
    );
    const [start_col, end_col] = getExtendedRoundedBorders(
      Math.max(0, viewport.startCol),
      viewport.endCol
    );

    for (const tableData of tablesData) {
      const { table, dynamicFields, isDynamicFieldsRequested } = tableData;
      const { tableName: escapedTableName } = table;
      const tableName = unescapeTableName(escapedTableName);
      const isTableHorizontal = table.getIsTableDirectionHorizontal();
      const [tableStartRow, tableStartCol] = table.getPlacement();
      const startDirectionValue = isTableHorizontal ? start_col : start_row;
      const endDirectionValue = isTableHorizontal ? end_col : end_row;
      const tableStart = isTableHorizontal ? tableStartCol : tableStartRow;

      const normalizedStartRow = Math.max(0, startDirectionValue - tableStart);
      const normalizedEndRow = endDirectionValue - tableStart;

      const fields = getTableFieldsForViewport(
        viewport,
        table,
        dynamicFields || [],
        isDynamicFieldsRequested
      );

      if (fields.length === 0) continue;

      const cachedTableViewport = this.cachedViewports[tableName];

      let rowsToRequest = this.getRowsToRequest(
        normalizedStartRow,
        normalizedEndRow,
        cachedTableViewport?.requestedRows
      );

      const cachedFields = cachedTableViewport?.fields || new Set();
      const updatedCachedFields = new Set([...cachedFields, ...fields]);
      const sameFields = cachedFields.size === updatedCachedFields.size;

      if (!sameFields && rowsToRequest.length === 0) {
        rowsToRequest = [[normalizedStartRow, normalizedEndRow]];
      }

      if (!tableData.dynamicFields && sameFields && rowsToRequest.length === 0)
        continue;

      this.cachedViewports[tableName] = {
        startRow: normalizedStartRow,
        endRow: normalizedEndRow,
        requestedRows: this.mergeRequestedRows(
          cachedTableViewport?.requestedRows,
          rowsToRequest
        ),
        fields: updatedCachedFields,
      };

      rowsToRequest.forEach(([rowStart, rowEnd]) => {
        viewports.push(
          ...fields.map(
            (field): Viewport => ({
              start_row: rowStart,
              end_row: rowEnd,
              fieldKey: { field, table: tableName },
            })
          )
        );
      });

      if (table.total && rowsToRequest.length > 0) {
        const { total } = table;

        for (const field of fields) {
          const fieldTotal = total.getFieldTotal(field);

          if (!fieldTotal) continue;

          const indexes = Object.keys(fieldTotal);
          viewports.push(
            ...indexes.map((index) => ({
              start_row: 0,
              end_row: 1,
              totalKey: {
                field,
                table: tableName,
                number: parseInt(index),
              },
            }))
          );
        }
      }
    }

    return viewports;
  }

  /**
   * Utility function to determine which rows to request by finding gaps in the cached data.
   */
  private getRowsToRequest(
    startRow: number,
    endRow: number,
    cachedRows?: number[][]
  ): number[][] {
    if (!cachedRows || cachedRows.length === 0) {
      return [[startRow, endRow]];
    }

    const rowsToRequest = [];
    let currentStart = startRow;

    cachedRows.forEach(([cachedStart, cachedEnd]) => {
      const requestEndRow = Math.min(cachedStart - 1, endRow);
      if (currentStart < cachedStart && currentStart < requestEndRow) {
        rowsToRequest.push([currentStart, requestEndRow]);
      }
      currentStart = Math.max(currentStart, cachedEnd + 1);
    });

    if (currentStart <= endRow) {
      rowsToRequest.push([currentStart - 1, endRow]);
    }

    return rowsToRequest;
  }

  /**
   * Utility function to merge newly requested rows with cached rows.
   */
  private mergeRequestedRows(cachedRows: number[][] = [], newRows: number[][]) {
    const mergedRows = [];
    const allRows = [...(cachedRows || []), ...newRows];

    allRows.sort(([aStart], [bStart]) => aStart - bStart);

    let currentRange = allRows[0];

    for (let i = 1; i < allRows.length; i++) {
      const [nextStart, nextEnd] = allRows[i];

      if (nextStart <= currentRange[1] + 1) {
        currentRange[1] = Math.max(currentRange[1], nextEnd);
      } else {
        mergedRows.push(currentRange);
        currentRange = allRows[i];
      }
    }

    mergedRows.push(currentRange);

    return mergedRows.filter(([start, end]) => start < end);
  }

  public buildChartViewportRequest(
    selectedKeys: SelectedChartKey[]
  ): Viewport[] {
    const viewportsToRequest: Viewport[] = [];

    for (const { tableName, fieldName, key } of selectedKeys) {
      // 1. Find key row in table data (only single key per table is supported)
      let row = -1;
      const tableData = this.viewGridData.getTableData(tableName);

      if (!tableData) return [];

      for (const chunkIndex of Object.keys(tableData.chunks)) {
        const chunk = tableData.chunks[parseInt(chunkIndex)];
        const columnChunk = chunk[fieldName];

        if (!columnChunk) continue;

        for (let i = 0; i < columnChunk.length; i++) {
          if (columnChunk[i] === key) {
            row = i;
            break;
          }
        }
      }

      if (row === -1) return [];

      // 2. Create viewport request for chart only for PERIOD_SERIES fields
      const fields: string[] = [];
      for (const field of Object.keys(tableData.types)) {
        if (tableData.types[field] === ColumnDataType.PERIOD_SERIES) {
          fields.push(field);
        }
      }

      if (fields.length === 0) return [];

      viewportsToRequest.push(
        ...fields.map((field) => ({
          start_row: row,
          end_row: row + 1,
          is_content: true,
          fieldKey: {
            field,
            table: tableName,
          },
        }))
      );
    }

    return viewportsToRequest;
  }

  public buildGetMoreChartKeysViewportRequest(
    tableName: string,
    fieldName: string
  ): Viewport[] {
    const tableData = this.viewGridData.getTableData(tableName);

    const { maxKnownRowIndex } = tableData;

    return [
      {
        start_row: maxKnownRowIndex,
        end_row: maxKnownRowIndex + chunkSize,
        fieldKey: {
          field: fieldName,
          table: tableName,
        },
      },
    ];
  }

  clear() {
    this.cachedViewports = {};
  }
}
