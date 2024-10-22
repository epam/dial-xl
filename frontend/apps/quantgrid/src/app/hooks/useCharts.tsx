import { useCallback, useContext, useEffect, useState } from 'react';

import { ChartsData, GridChart } from '@frontend/common';

import { ChartUpdate, ProjectContext, ViewportContext } from '../context';
import { saveChartKey } from '../services';

type SelectedChartKey = {
  tableName: string;
  fieldName: string;
  key: string;
};

export function useCharts() {
  const { viewGridData } = useContext(ViewportContext);
  const {
    projectName,
    projectBucket,
    projectPath,
    sheetName,
    projectSheets,
    sheetContent,
    getCurrentProjectViewport,
  } = useContext(ProjectContext);

  const [charts, setCharts] = useState<GridChart[]>([]);
  const [chartData, setChartData] = useState<ChartsData>({});

  // Handle lazy loading of the chart keys in the chart key dropdown
  const getMoreChartKeys = useCallback(
    (tableName: string, fieldName: string) => {
      if (!projectName || !sheetName || !sheetContent || !projectSheets) return;

      const viewportRequest = viewGridData.buildGetMoreChartKeysViewportRequest(
        tableName,
        fieldName
      );

      if (Object.keys(viewportRequest).length === 0) return;

      getCurrentProjectViewport(viewportRequest);
    },
    [
      projectName,
      sheetName,
      sheetContent,
      projectSheets,
      viewGridData,
      getCurrentProjectViewport,
    ]
  );

  // Prepare and send content viewport request for charts
  const sendChartViewports = useCallback(
    (selectedKeys: SelectedChartKey[]) => {
      if (
        !projectName ||
        !sheetName ||
        !sheetContent ||
        !projectSheets ||
        selectedKeys.length === 0
      )
        return;

      const chartViewportRequest =
        viewGridData.buildChartViewportRequest(selectedKeys);

      if (chartViewportRequest.length === 0) return;

      getCurrentProjectViewport(chartViewportRequest);
    },
    [
      getCurrentProjectViewport,
      projectName,
      projectSheets,
      sheetContent,
      sheetName,
      viewGridData,
    ]
  );

  // Handle selected key from the chart key dropdown
  const selectChartKey = useCallback(
    (tableName: string, fieldName: string, key: string) => {
      if (!projectName || !projectBucket) return;

      sendChartViewports([{ tableName, fieldName, key }]);

      saveChartKey(
        tableName,
        fieldName,
        key,
        projectName,
        projectBucket,
        projectPath
      );
    },
    [projectBucket, projectName, projectPath, sendChartViewports]
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
  }, [projectName, sheetName, viewGridData]);

  useEffect(() => {
    if (!projectName || !sheetName || !projectBucket) return;

    const handleUpdateChartStructure = (chartUpdates: ChartUpdate[]) => {
      const charts = viewGridData.getCharts(
        projectName,
        projectBucket,
        projectPath
      );
      const selectedChartKeys: SelectedChartKey[] = [];

      if (!chartUpdates.length) return;

      if (
        chartUpdates.length === 1 &&
        Object.keys(chartUpdates[0]).length === 0
      ) {
        setCharts(charts);

        return;
      }

      // TODO: Remove request grouping
      for (const chartUpdate of chartUpdates) {
        const { chartName, isKeyUpdate } = chartUpdate;

        if (!isKeyUpdate || !chartName) continue;

        const currentChart = charts.find(
          (chart) => chart.tableName === chartName
        );

        if (!currentChart) return;

        const { availableKeys, selectedKeys } = currentChart;

        const fieldKeys = Object.keys(selectedKeys);

        for (const fieldKey of fieldKeys) {
          const availableKeysForFieldKey = availableKeys[fieldKey];
          const currentSelectedKey = selectedKeys[fieldKey];

          if (
            !availableKeysForFieldKey ||
            !availableKeysForFieldKey.length ||
            !currentSelectedKey
          ) {
            continue;
          }

          if (availableKeysForFieldKey.includes(currentSelectedKey)) {
            selectedChartKeys.push({
              tableName: chartName,
              fieldName: fieldKey,
              key: currentSelectedKey,
            });
            continue;
          }

          const newKey = availableKeysForFieldKey[0];

          currentChart.selectedKeys[fieldKey] = newKey;

          saveChartKey(
            chartName,
            fieldKey,
            newKey,
            projectName,
            projectBucket,
            projectPath
          );

          selectedChartKeys.push({
            tableName: chartName,
            fieldName: fieldKey,
            key: newKey,
          });
        }
      }

      sendChartViewports(selectedChartKeys);
      setCharts(charts);
    };

    // if component had unmounted
    setCharts(viewGridData.getCharts(projectName, projectBucket, projectPath));

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
    sendChartViewports,
    sheetName,
    sheetContent,
    viewGridData,
  ]);

  return {
    getMoreChartKeys,
    selectChartKey,
    chartData,
    charts,
  };
}
