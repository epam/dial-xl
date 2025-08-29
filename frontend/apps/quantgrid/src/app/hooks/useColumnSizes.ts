import { useContext, useEffect, useState } from 'react';

import {
  EventTypeColumnResize,
  EventTypeColumnResizeDbClick,
  EventTypeResetCurrentColumnSizes,
  filterByTypeAndCast,
  GridEvent,
} from '@frontend/canvas-spreadsheet';
import { CachedViewport } from '@frontend/common';

import { AppContext, ProjectContext } from '../context';
import { useGridApi } from './useGridApi';

const maxColumnAutoWidth = 1000;
const minColumnAutoWidth = 50;

export function useColumnSizes(viewport: CachedViewport) {
  const gridApi = useGridApi();
  const { projectName, sheetName } = useContext(ProjectContext);
  const { zoom } = useContext(AppContext);

  const [columnSizes, setColumnSizes] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!gridApi || !projectName || !sheetName) return;

    const columnSizeChangeSubscription = gridApi.events$
      .pipe(filterByTypeAndCast<EventTypeColumnResize>(GridEvent.columnResize))
      .subscribe((event) => {
        const { column, width } = event;

        gridApi.clearSelection();

        const columnWidths: Record<string, Record<string, number>> = JSON.parse(
          localStorage.getItem('columnWidths') || '{}'
        );
        const sheetColumnWidths =
          columnWidths[projectName + '/' + sheetName] || {};

        sheetColumnWidths[column] = Math.floor(width / zoom);
        columnWidths[projectName + '/' + sheetName] = sheetColumnWidths;

        localStorage.setItem('columnWidths', JSON.stringify(columnWidths));

        setColumnSizes(sheetColumnWidths);
      });

    return () => {
      columnSizeChangeSubscription.unsubscribe();
    };
  }, [gridApi, projectName, sheetName, zoom]);

  useEffect(() => {
    if (!gridApi || !projectName || !sheetName) return;

    const columnResizeDbClickSubscription = gridApi.events$
      .pipe(
        filterByTypeAndCast<EventTypeColumnResizeDbClick>(
          GridEvent.columnResizeDbClick
        )
      )
      .subscribe((event) => {
        gridApi.clearSelection();

        const { column } = event;

        const col = +column;

        const { startRow, endRow } = viewport;

        const maxSymbols = gridApi.getColumnContentMaxSymbols(
          col,
          startRow,
          endRow
        );

        const columnWidths: Record<string, Record<string, number>> = JSON.parse(
          localStorage.getItem('columnWidths') || '{}'
        );

        const sheetColumnWidths =
          columnWidths[projectName + '/' + sheetName] || {};

        const symbolWidth = gridApi.getCanvasSymbolWidth();
        const paddingOffset = 2 * symbolWidth;

        sheetColumnWidths[column] = Math.max(
          minColumnAutoWidth,
          Math.min(maxColumnAutoWidth, maxSymbols * symbolWidth + paddingOffset)
        );

        columnWidths[projectName + '/' + sheetName] = sheetColumnWidths;

        localStorage.setItem('columnWidths', JSON.stringify(columnWidths));

        setColumnSizes(sheetColumnWidths);
      });

    return () => {
      columnResizeDbClickSubscription.unsubscribe();
    };
  }, [gridApi, projectName, sheetName, viewport, zoom]);

  useEffect(() => {
    if (!gridApi || !projectName || !sheetName) return;

    const resetColumnSizesSubscription = gridApi.events$
      .pipe(
        filterByTypeAndCast<EventTypeResetCurrentColumnSizes>(
          GridEvent.resetCurrentColumnSizes
        )
      )
      .subscribe(() => {
        gridApi.clearSelection();

        const columnWidths: Record<string, Record<string, number>> = JSON.parse(
          localStorage.getItem('columnWidths') || '{}'
        );

        columnWidths[projectName + '/' + sheetName] = {};

        localStorage.setItem('columnWidths', JSON.stringify(columnWidths));
        setColumnSizes({});
      });

    return () => {
      resetColumnSizesSubscription.unsubscribe();
    };
  }, [gridApi, projectName, sheetName, viewport, zoom]);

  useEffect(() => {
    if (!projectName || !sheetName) {
      setColumnSizes({});

      return;
    }

    const columnWidths: Record<string, Record<string, number>> = JSON.parse(
      localStorage.getItem('columnWidths') || '{}'
    );

    const sheetColumnWidths = columnWidths[projectName + '/' + sheetName] || {};

    setColumnSizes(sheetColumnWidths);
  }, [projectName, sheetName, zoom]);

  return {
    columnSizes,
  };
}
