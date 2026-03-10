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
      hasNoData = false,
    ) => {
      if (!projectName || !projectBucket) return;

      const tableData = viewGridData.getTableData(tableName);
      const chartType = tableData.table.getChartType();

      if (!tableData || !chartType) return;

      sendChartDataViewports([{ tableName, fieldName, key, chartType }]);

      if (!tableData.types[fieldName] && !isCustomChartSelector(fieldName))
        return;

      if (fieldName === chartRowNumberSelector) {
        const selectorValue = typeof key === 'string' ? escapeValue(key) : key;
        updateTableDecoratorValue(
          tableName,
          selectorValue,
          chartSelectorDecoratorName,
        );
      } else if (fieldName === histogramChartSeriesSelector) {
        const selectorValue = typeof key === 'string' ? escapeValue(key) : key;
        updateTableDecoratorValue(
          tableName,
          selectorValue,
          chartSelectorDecoratorName,
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
    ],
  );

  useEffect(() => {
    if (!projectName || !sheetName) return;

    const handleDataUpdate = (chartUpdates: ChartUpdate[]) => {
      if (!chartUpdates.some((chartUpdate) => !!chartUpdate.isChartDataUpdate))
        return;

      setChartData(viewGridData.getChartsData());
    };

    const dataUpdateSubscription =
      viewGridData.chartUpdate.subscribe(handleDataUpdate);

    return () => {
      dataUpdateSubscription.unsubscribe();
    };
  }, [projectName, sheetName, viewGridData]);

  useEffect(() => {
    setChartData(viewGridData.getChartsData());
  }, [charts, viewGridData]);

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
          (chart) => chart.tableName === chartName,
        );

        if (!currentChart) continue;

        const { selectedKeys, selectorFieldNames, chartType } = currentChart;

        const isEmptySelectorValue = (v: unknown) => {
          if (v === null || v === undefined) return true;
          if (Array.isArray(v)) return v.length === 0;

          return v === '';
        };

        // Pick only selectors that actually have a value
        const nonEmptySelectorFieldNames = selectorFieldNames.filter(
          (name) => !isEmptySelectorValue(selectedKeys[name]),
        );

        const hasAnyNonEmptySelector = nonEmptySelectorFieldNames.length > 0;

        // If there are no selectors OR all selectors are empty — we consider that there are no selectors
        if (!hasAnyNonEmptySelector) {
          // Special case: empty rowNumber selector, but the table has 1 row -> show chart with 1 row
          const hasRowNumberSelector = selectorFieldNames.includes(
            chartRowNumberSelector,
          );
          const itemExists = selectedChartKeys.some(
            (i) =>
              i.tableName === chartName &&
              i.fieldName === chartRowNumberSelector,
          );

          if (hasRowNumberSelector && !itemExists) {
            const tableData = viewGridData.getTableData(chartName);

            if (tableData.totalRows === 1) {
              selectedChartKeys.push({
                tableName: chartName,
                fieldName: chartRowNumberSelector,
                key: '1',
                chartType,
              });

              continue;
            }
          }

          // In case there are no selectors at all
          const alreadyAdded = tablesWithoutSelectors.some(
            (i) => i.tableName === chartName,
          );
          if (!alreadyAdded) {
            tablesWithoutSelectors.push({ tableName: chartName, chartType });
          }

          continue;
        }

        // Request chart data only for non-empty selectors
        for (const selectorFieldName of nonEmptySelectorFieldNames) {
          const currentSelectedKey = selectedKeys[selectorFieldName];

          const itemExists = selectedChartKeys.some(
            (i) =>
              i.fieldName === selectorFieldName && i.tableName === chartName,
          );
          if (itemExists) continue;

          const escapedKey = Array.isArray(currentSelectedKey)
            ? currentSelectedKey.map((k) =>
                typeof k === 'number'
                  ? k
                  : escapeName(k, stringShouldBeEscapedChars, false),
              )
            : typeof currentSelectedKey === 'number'
              ? currentSelectedKey
              : escapeName(
                  currentSelectedKey,
                  stringShouldBeEscapedChars,
                  false,
                );

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
      handleUpdateChartStructure,
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
