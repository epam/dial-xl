import { useCallback, useContext } from 'react';

import {
  ChartTableWithoutSelectors,
  ChartType,
  SelectedChartKey,
} from '@frontend/common';
import { escapeTableName } from '@frontend/parser';

import { ProjectContext, ViewGridData, ViewportContext } from '../../context';
import {
  applySelectorFiltersToChartTables,
  buildHistogramChartRequest,
} from '../../utils';

export function useGetChartsData() {
  const { viewGridData } = useContext(ViewportContext);
  const {
    projectName,
    sheetName,
    parsedSheets,
    sheetContent,
    getCurrentProjectViewport,
  } = useContext(ProjectContext);

  /**
   * Prepare and send content viewport request for the charts data
   */
  const sendChartDataViewports = useCallback(
    (
      selectedKeys: SelectedChartKey[],
      tablesWithoutSelectors: ChartTableWithoutSelectors[] = []
    ) => {
      if (
        !projectName ||
        !sheetName ||
        !sheetContent ||
        !parsedSheets ||
        (selectedKeys.length === 0 && tablesWithoutSelectors.length === 0)
      )
        return;

      const chartViewportRequest = viewGridData.buildChartViewportRequest(
        selectedKeys,
        tablesWithoutSelectors
      );

      if (chartViewportRequest.length === 0) return;

      let updatedSheetContent = sheetContent;

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

        if (table.getChartType() === ChartType.HISTOGRAM) {
          const virtualTableDSL = buildHistogramChartRequest(
            chartViewportRequest,
            table,
            viewGridData,
            parsedSheets
          );

          updatedSheetContent += virtualTableDSL;
        }
      }

      getCurrentProjectViewport(chartViewportRequest, updatedSheetContent);
    },
    [
      getCurrentProjectViewport,
      projectName,
      parsedSheets,
      sheetContent,
      sheetName,
      viewGridData,
    ]
  );

  return {
    sendChartDataViewports,
  };
}

export function sortChartTablesDesc(
  selectedKeys: SelectedChartKey[],
  viewGridData: ViewGridData
) {
  const chartTableNames = new Set(
    selectedKeys
      .filter((i) => i.chartType !== ChartType.PERIOD_SERIES)
      .map((i) => i.tableName)
  );

  return Array.from(chartTableNames).sort((a, b) => {
    const tableA = viewGridData.getTableData(escapeTableName(a)).table;
    const tableB = viewGridData.getTableData(escapeTableName(b)).table;

    if (!tableA?.dslPlacement || !tableB?.dslPlacement) return 0;

    return tableB.dslPlacement.startOffset - tableA.dslPlacement.startOffset;
  });
}
