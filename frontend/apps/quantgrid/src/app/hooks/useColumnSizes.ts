import { useContext, useEffect, useState } from 'react';

import {
  EventTypeColumnResize,
  EventTypeColumnResizeDbClick,
  filterByTypeAndCast,
  GridEvent,
} from '@frontend/spreadsheet';

import { CachedViewport } from '../common';
import { AppContext, ProjectContext, SpreadsheetContext } from '../context';

export function useColumnSizes(viewport: CachedViewport) {
  const { gridApi, gridService } = useContext(SpreadsheetContext);
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

        sheetColumnWidths[column.id] = Math.floor(width / zoom);
        columnWidths[projectName + '/' + sheetName] = sheetColumnWidths;

        localStorage.setItem('columnWidths', JSON.stringify(columnWidths));
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
        if (!gridService) return;

        gridApi.clearSelection();

        const { column } = event;

        const col = +column.id;

        const { startRow, endRow } = viewport;

        const maxSymbols = gridService.getColumnContentMaxSymbols(
          col,
          startRow,
          endRow
        );

        const columnWidths: Record<string, Record<string, number>> = JSON.parse(
          localStorage.getItem('columnWidths') || '{}'
        );

        const sheetColumnWidths =
          columnWidths[projectName + '/' + sheetName] || {};

        sheetColumnWidths[column.id] = maxSymbols * 8;

        columnWidths[projectName + '/' + sheetName] = sheetColumnWidths;

        localStorage.setItem('columnWidths', JSON.stringify(columnWidths));

        setColumnSizes(sheetColumnWidths);
      });

    return () => {
      columnResizeDbClickSubscription.unsubscribe();
    };
  }, [gridApi, gridService, projectName, sheetName, viewport, zoom]);

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
