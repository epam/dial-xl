import { useCallback, useContext, useEffect, useState } from 'react';

import {
  chartRowNumberSelector,
  ChartsData,
  ChartTableWithoutSelectors,
  GridChart,
  histogramChartSeriesSelector,
  SelectedChartKey,
} from '@frontend/common';
import {
  chartSelectorDecoratorName,
  escapeName,
  escapeValue,
  stringShouldBeEscapedChars,
} from '@frontend/parser';

import { ChartUpdate, ProjectContext, ViewportContext } from '../../context';
import { isCustomChartSelector } from '../../utils';
import { useChartEditDsl, useTableEditDsl } from '../EditDsl';
import { useChartKeys } from './useChartKeys';
import { useGetChartsData } from './useGetChartsData';

export function useCharts() {
  const { viewGridData } = useContext(ViewportContext);
  const { projectName, projectBucket, projectPath, sheetName, sheetContent } =
    useContext(ProjectContext);
  const { updateTableDecoratorValue } = useTableEditDsl();
  const { updateSelectorValue } = useChartEditDsl();
  const { sendChartDataViewports } = useGetChartsData();
  const { getMoreChartKeys, sendChartKeyViewports } = useChartKeys();

  const [charts, setCharts] = useState<GridChart[]>([]);
  const [chartData, setChartData] = useState<ChartsData>({});

  /**
   * Handle the selection of a key from the chart key dropdown.
   * Save the selected key to the !selector decorator on a table or field level.
   */
  const selectChartKey = useCallback(
    (
      tableName: string,
      fieldName: string,
      key: string | string[],
      hasNoData = false
    ) => {
      if (!projectName || !projectBucket) return;

      const tableData = viewGridData.getTableData(tableName);
      const chartType = tableData.table.getChartType();

      if (!tableData || !chartType) return;

      sendChartDataViewports([{ tableName, fieldName, key, chartType }]);

      if (!tableData.types[fieldName] && !isCustomChartSelector(fieldName))
        return;

      if (fieldName === chartRowNumberSelector) {
        updateTableDecoratorValue(tableName, key, chartSelectorDecoratorName);
      } else if (fieldName === histogramChartSeriesSelector) {
        const selectorValue = typeof key === 'string' ? escapeValue(key) : key;
        updateTableDecoratorValue(
          tableName,
          selectorValue,
          chartSelectorDecoratorName
        );
      } else {
        const selectorValue =
          typeof key === 'string' && key.length === 0
            ? ''
            : escapeValue(key as string, false, true);
        updateSelectorValue(tableName, fieldName, selectorValue, hasNoData);
      }

      if (!key) {
        viewGridData.clearChartData(tableName);
      }
    },
    [
      projectBucket,
      projectName,
      sendChartDataViewports,
      updateSelectorValue,
      updateTableDecoratorValue,
      viewGridData,
    ]
  );

  useEffect(() => {
    if (!projectName || !sheetName) return;

    const handleDataUpdate = (chartUpdates: ChartUpdate[]) => {
      if (!chartUpdates.some((chartUpdate) => !!chartUpdate.isChartDataUpdate))
        return;

      setChartData(viewGridData.getChartsData());
    };

    // init data update call, if component had unmounted
    setChartData(viewGridData.getChartsData());

    const dataUpdateSubscription =
      viewGridData.chartUpdate.subscribe(handleDataUpdate);

    return () => {
      dataUpdateSubscription.unsubscribe();
    };
  }, [charts, projectName, sheetName, viewGridData]);

  useEffect(() => {
    if (!projectName || !sheetName || !projectBucket) return;

    const handleUpdateChartStructure = (chartUpdates: ChartUpdate[]) => {
      if (!chartUpdates.length) return;

      const charts = viewGridData.getCharts();
      const selectedChartKeys: SelectedChartKey[] = [];
      const tablesWithoutSelectors: ChartTableWithoutSelectors[] = [];

      if (
        chartUpdates.length === 1 &&
        Object.keys(chartUpdates[0]).length === 0
      ) {
        setCharts(charts);

        return;
      }

      for (const chartUpdate of chartUpdates) {
        const { chartName, isKeyUpdate, virtualTableName } = chartUpdate;

        if (isKeyUpdate && virtualTableName) {
          viewGridData.updateChartWithNewKeys(charts, virtualTableName);
        }

        if (!isKeyUpdate || !chartName) continue;

        const currentChart = charts.find(
          (chart) => chart.tableName === chartName
        );

        if (!currentChart) continue;

        const { selectedKeys, selectorFieldNames, chartType } = currentChart;

        const selectedSelectors = Object.keys(selectedKeys);

        const addToTablesWithoutSelectors =
          selectorFieldNames.length === 0 &&
          !tablesWithoutSelectors.some((i) => i.tableName === chartName);

        if (addToTablesWithoutSelectors) {
          tablesWithoutSelectors.push({ tableName: chartName, chartType });
        }

        // All selectors must have values to request chart data
        if (selectorFieldNames.length !== selectedSelectors.length) {
          // Special case: empty rowNumber selector, but table has 1 row -> show chart with 1 row
          const hasRowNumberSelector = selectorFieldNames.some(
            (i) => i === chartRowNumberSelector
          );
          const itemExists = selectedChartKeys.some(
            (i) =>
              i.tableName === chartName &&
              i.fieldName === chartRowNumberSelector
          );

          if (!hasRowNumberSelector || itemExists) continue;

          const tableData = viewGridData.getTableData(chartName);

          if (tableData.totalRows === 1) {
            selectedChartKeys.push({
              tableName: chartName,
              fieldName: chartRowNumberSelector,
              key: '1',
              chartType,
            });
          }

          continue;
        }

        for (const selectorFieldName of selectedSelectors) {
          const currentSelectedKey = selectedKeys[selectorFieldName];

          if (!currentSelectedKey) continue;

          const itemExists = selectedChartKeys.some(
            (i) =>
              i.fieldName === selectorFieldName && i.tableName === chartName
          );
          if (itemExists) continue;

          const escapedKey = Array.isArray(currentSelectedKey)
            ? currentSelectedKey.map((k) =>
                typeof k === 'number'
                  ? k
                  : escapeName(k, stringShouldBeEscapedChars, false)
              )
            : typeof currentSelectedKey === 'number'
            ? currentSelectedKey
            : escapeName(currentSelectedKey, stringShouldBeEscapedChars, false);

          selectedChartKeys.push({
            tableName: chartName,
            fieldName: selectorFieldName,
            key: escapedKey,
            chartType,
          });
        }
      }

      sendChartDataViewports(selectedChartKeys, tablesWithoutSelectors);
      setCharts(charts);
    };

    // if component had unmounted
    setCharts(viewGridData.getCharts());

    const chartUpdateStructureSubscription = viewGridData.chartUpdate.subscribe(
      handleUpdateChartStructure
    );

    return () => {
      chartUpdateStructureSubscription.unsubscribe();
    };
  }, [
    projectBucket,
    projectName,
    projectPath,
    sendChartDataViewports,
    sheetName,
    sheetContent,
    viewGridData,
  ]);

  return {
    sendChartKeyViewports,
    getMoreChartKeys,
    selectChartKey,
    chartData,
    charts,
  };
}
