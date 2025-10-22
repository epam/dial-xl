import {
  chartRowNumberSelector,
  ChartTableWithoutSelectors,
  ChartType,
  ColumnDataType,
  isNumericType,
  SelectedChartKey,
  Viewport,
} from '@frontend/common';
import { unescapeTableName } from '@frontend/parser';

import { TableData } from './types';
import { ViewGridData } from './ViewGridData';

const defaultChartViewportRows = 1000;

/**
 * Class which is generating viewport request considering tablesData
 */
export class ViewportChartBuilder {
  protected viewGridData: ViewGridData;

  protected cachedChartViewports: Map<string, Set<string>>;

  constructor(viewGridData: ViewGridData) {
    this.viewGridData = viewGridData;

    this.cachedChartViewports = new Map();
  }

  public buildChartViewportRequest(
    selectedKeys: SelectedChartKey[],
    tablesWithoutSelectors: ChartTableWithoutSelectors[]
  ): Viewport[] {
    const viewportsToRequest: Viewport[] = [];
    const requestTableNames = new Map<string, string[]>();

    const mergedSelectedKeys = [...selectedKeys];

    // Merge charts with selected keys (selectors) and tables without selectors to have one flow for both cases
    for (const tableWithoutSelector of tablesWithoutSelectors) {
      const { chartType, tableName } = tableWithoutSelector;

      if (mergedSelectedKeys.some((key) => key.tableName === tableName))
        continue;

      mergedSelectedKeys.push({
        chartType,
        tableName,
        fieldName: '',
        key: '',
      });
    }

    for (const selectedKey of mergedSelectedKeys) {
      const { tableName, chartType } = selectedKey;

      // Handle period series chart separately, because of different data request logic
      if (chartType === ChartType.PERIOD_SERIES) {
        this.buildPeriodSeriesViewportRequest(selectedKey, viewportsToRequest);
        continue;
      }

      const unescapedTableName = unescapeTableName(tableName);

      if (
        viewportsToRequest.some(
          (v) => v?.fieldKey?.table === unescapedTableName
        )
      )
        continue;

      const tableData = this.viewGridData.getTableData(tableName);

      if (!tableData) continue;
      if (Object.keys(tableData.types).length === 0) continue;

      const fieldsToRequest: string[] = this.collectFieldsToRequest(tableData);

      // Check if we already cached this table with the same fields
      const cachedFields = this.cachedChartViewports.get(tableName);
      if (cachedFields) {
        const fieldsToRequestSet = new Set(fieldsToRequest);
        const allFieldsCached = fieldsToRequest.every((field) =>
          cachedFields.has(field)
        );
        const sameSizeFields = cachedFields.size === fieldsToRequestSet.size;

        // Skip the request if all fields are already cached
        if (allFieldsCached && sameSizeFields) continue;
      }
      const rowNumberKey = mergedSelectedKeys.find(
        (key) =>
          key.fieldName === chartRowNumberSelector &&
          key.tableName === tableName
      );

      // Special case for horizontal pie/bar chart:
      // row number selector works as a numeric field selector, need to receive all table data
      const isHorizontalChart =
        tableData.table.getChartOrientation() === 'horizontal';

      if (rowNumberKey && !isHorizontalChart) {
        this.addChartRowNumberViewports(
          rowNumberKey,
          fieldsToRequest,
          unescapedTableName,
          viewportsToRequest
        );
      } else {
        this.addChartDefaultViewports(
          fieldsToRequest,
          unescapedTableName,
          viewportsToRequest
        );
      }

      if (fieldsToRequest.length) {
        requestTableNames.set(tableName, fieldsToRequest);
      }
    }

    requestTableNames.forEach((fieldsToRequest, tableName) => {
      const existingFields = this.cachedChartViewports.get(tableName);
      if (existingFields) {
        // Merge with existing fields
        fieldsToRequest.forEach((field) => existingFields.add(field));
      } else {
        // Create a new entry
        this.cachedChartViewports.set(tableName, new Set(fieldsToRequest));
      }
    });

    return viewportsToRequest;
  }

  private collectFieldsToRequest(tableData: TableData): string[] {
    const fieldsToRequest: string[] = [];

    for (const field of tableData.table.fields) {
      const fieldName = field.key.fieldName;
      const isNumeric = isNumericType(tableData.types[fieldName]);
      const isXAxis = field.isChartXAxis();
      const isDotColor = field.isChartDotColor();
      const isDotSize = field.isChartDotSize();
      const isDynamic = field.isDynamic;

      if (isNumeric || isXAxis || isDotColor || isDotSize || isDynamic) {
        fieldsToRequest.push(fieldName);
      }
    }

    return fieldsToRequest;
  }

  private addChartRowNumberViewports(
    rowNumberKey: SelectedChartKey,
    fieldsToRequest: string[],
    unescapedTableName: string,
    viewports: Viewport[]
  ): void {
    const { key } = rowNumberKey;
    const rowNumbers = Array.isArray(key) ? key : [key];

    for (const rowNumber of rowNumbers) {
      const rowIndex = parseInt(rowNumber as string) - 1;

      for (const field of fieldsToRequest) {
        viewports.push({
          start_row: rowIndex,
          end_row: rowIndex + 1,
          fieldKey: { field, table: unescapedTableName },
          is_raw: true,
        });
      }
    }
  }

  private addChartDefaultViewports(
    fieldsToRequest: string[],
    unescapedTableName: string,
    viewports: Viewport[]
  ): void {
    for (const field of fieldsToRequest) {
      viewports.push({
        start_row: 0,
        end_row: defaultChartViewportRows,
        fieldKey: { field, table: unescapedTableName },
        is_raw: true,
      });
    }
  }

  private buildPeriodSeriesViewportRequest(
    selectedKey: SelectedChartKey,
    viewportsToRequest: Viewport[]
  ): void {
    const { tableName, fieldName, key } = selectedKey;

    // 1. Find a key row in table data (only a single key per table is supported)
    let row = -1;
    const tableData = this.viewGridData.getTableData(tableName);

    if (!tableData) return;

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

    if (row === -1) return;

    // 2. Create a viewport request for the chart only for PERIOD_SERIES fields
    const fields: string[] = [];
    for (const field of Object.keys(tableData.types)) {
      if (tableData.types[field] === ColumnDataType.PERIOD_SERIES) {
        fields.push(field);
      }
    }

    if (fields.length === 0) return;

    viewportsToRequest.push(
      ...fields.map((field) => ({
        start_row: row,
        end_row: row + 1,
        is_content: true,
        fieldKey: {
          field,
          table: unescapeTableName(tableName),
        },
        is_raw: true,
      }))
    );
  }

  clear() {
    this.cachedChartViewports = new Map();
  }
}
