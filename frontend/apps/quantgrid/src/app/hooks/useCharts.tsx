import { useCallback, useContext, useEffect } from 'react';

import { Viewport } from '@frontend/common';

import { ProjectContext, ViewportContext } from '../context';
import {
  createGetMoreChartKeysRequest,
  getChartKeysByProject,
  saveChartKey,
} from '../services';
import { useApi } from './useApi';

type SelectedChartKey = {
  tableName: string;
  fieldName: string;
  key: string;
};

export function useCharts() {
  const { chartKeys, tableData } = useContext(ViewportContext);
  const { projectName, parsedSheet } = useContext(ProjectContext);
  const { getViewport } = useApi();

  // Handle lazy loading of the chart keys in the chart key dropdown
  const getMoreChartKeys = useCallback(
    (tableName: string, fieldName: string) => {
      if (!projectName) return;

      const viewportRequest = createGetMoreChartKeysRequest(
        chartKeys,
        tableName,
        fieldName
      );

      if (Object.keys(viewportRequest).length === 0) return;

      getViewport(projectName, viewportRequest);
    },
    [getViewport, projectName, chartKeys]
  );

  // Prepare and send content viewport request for charts
  const sendChartViewports = useCallback(
    (selectedKeys: SelectedChartKey[]) => {
      if (!projectName || selectedKeys.length === 0) return;

      const viewportRequest: Record<string, Viewport> = {};

      for (const { tableName, fieldName, key } of selectedKeys) {
        // 1. Find key row in table data (only single key per table is supported)
        let row = -1;
        const cachedTableData = tableData[tableName];

        if (!cachedTableData) return;

        for (const chunkIndex of Object.keys(cachedTableData.chunks)) {
          const chunk = cachedTableData.chunks[parseInt(chunkIndex)];
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

        // 2. Create viewport request for chart only for PERIOD_SERIES fields
        const fields: string[] = [];
        for (const field of Object.keys(cachedTableData.types)) {
          if (cachedTableData.types[field] === 'PERIOD_SERIES') {
            fields.push(field);
          }
        }

        if (fields.length === 0) return;

        viewportRequest[tableName] = {
          start_row: row,
          end_row: row + 1,
          is_content: true,
          fields,
        };
      }

      if (Object.keys(viewportRequest).length === 0) return;

      getViewport(projectName, viewportRequest);
    },
    [getViewport, projectName, tableData]
  );

  // Handle selected key from the chart key dropdown
  const selectChartKey = useCallback(
    (tableName: string, fieldName: string, key: string) => {
      if (!projectName) return;

      saveChartKey(projectName, tableName, fieldName, key);

      sendChartViewports([{ tableName, fieldName, key }]);
    },
    [projectName, sendChartViewports]
  );

  // Get saved selected chart keys form localStorage and send single viewport request for all charts
  useEffect(() => {
    if (!projectName || !parsedSheet) return;

    const savedChartKeys = getChartKeysByProject(projectName);
    const selectedChartKeys: SelectedChartKey[] = [];

    Object.keys(savedChartKeys).forEach((tableName) => {
      const table = parsedSheet?.tables.find(
        (table) => table.tableName === tableName
      );

      if (!table) return;

      const savedChartKeysForTable = savedChartKeys[tableName];

      Object.keys(savedChartKeysForTable).forEach((fieldName) => {
        const key = savedChartKeysForTable[fieldName];

        if (!key) return;

        selectedChartKeys.push({ tableName, fieldName, key });
      });
    });

    if (selectedChartKeys.length === 0) return;

    sendChartViewports(selectedChartKeys);
  }, [parsedSheet, projectName, selectChartKey, sendChartViewports]);

  return {
    getMoreChartKeys,
    selectChartKey,
  };
}
