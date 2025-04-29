import { SelectedChartKey, Viewport } from '@frontend/common';
import { escapeTableName } from '@frontend/parser';

import { ViewGridData } from '../../context';
import { applySelectorFiltersToChartTables } from '../../utils';
import { sortChartTablesDesc } from './useGetChartsData';

/**
 * Use in the SpreadsheetWrapper after collecting tables for the viewport request.
 * For all chart tables included in the viewport request, add chart filters (field selectors) to the DSL content.
 * This is primarily needed to ensure correct row numbers (columnData.totalRows) for pie/bar charts.
 */
export function addChartFiltersToDefaultViewportRequest(
  viewportRequest: Viewport[],
  viewGridData: ViewGridData,
  sheetContent: string
) {
  let updatedSheetContent = sheetContent;

  const uniqueTableNames = new Set(
    viewportRequest
      .filter((v) => v.fieldKey?.table)
      .map((v) => v.fieldKey!.table)
  );

  const selectedKeys: SelectedChartKey[] = [];

  for (const tableName of uniqueTableNames) {
    const tableData = viewGridData.getTableData(escapeTableName(tableName));

    if (!tableData?.table) continue;

    const { table } = tableData;
    const chartType = table.getChartType();

    if (!chartType) continue;

    for (const field of table.fields) {
      const { fieldName } = field.key;

      if (!field.isChartSelector()) continue;

      const key = field.getChartSelectorValue();

      if (!key) continue;

      const selectedKey: SelectedChartKey = {
        tableName,
        fieldName,
        chartType,
        key,
      };

      selectedKeys.push(selectedKey);
    }
  }

  for (const tableName of sortChartTablesDesc(selectedKeys, viewGridData)) {
    const tableData = viewGridData.getTableData(escapeTableName(tableName));

    if (!tableData?.table) continue;

    const { table } = tableData;

    const tableSelectedKeys = selectedKeys.filter(
      (i) => i.tableName === tableName
    );

    updatedSheetContent = applySelectorFiltersToChartTables(
      updatedSheetContent,
      table,
      tableSelectedKeys,
      viewGridData
    );
  }

  return updatedSheetContent;
}
