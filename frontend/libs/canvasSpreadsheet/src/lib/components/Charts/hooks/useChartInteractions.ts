import { useCallback, useEffect, useRef, useState } from 'react';

import { GridApi, GridTable } from '../../../types';
import {
  filterByTypeAndCast,
  getMousePosition,
  GridEventBus,
} from '../../../utils';
import {
  EventTypeStartMoveEntity,
  EventTypeStartMoveMode,
  EventTypeStopMoveMode,
  GridEvent,
} from '../../GridApiWrapper';
import { ChartConfig } from '../types';

type Args = {
  api: GridApi | null;
  eventBus: GridEventBus;
  tableStructure: GridTable[];
};

export function useChartInteractions({ api, eventBus, tableStructure }: Args) {
  const [moveMode, setMoveMode] = useState(false);
  const [moveEntity, setMoveEntity] = useState(false);
  const tableStructureRef = useRef<GridTable[]>(tableStructure);

  useEffect(() => {
    tableStructureRef.current = tableStructure;
  }, [tableStructure]);

  const handleChartResize = useCallback(
    (tableName: string, cols: number, rows: number) => {
      if (!api) return;

      eventBus.emit({
        type: 'charts/resize',
        payload: { tableName, cols, rows },
      });
    },
    [api, eventBus]
  );

  const onLoadMoreKeys = useCallback(
    (tableName: string, fieldName: string) => {
      eventBus.emit({
        type: 'charts/get-keys',
        payload: { tableName, fieldName },
      });
    },
    [eventBus]
  );

  const onSelectKey = useCallback(
    (
      tableName: string,
      fieldName: string,
      value: string | string[],
      isNoDataKey = false
    ) => {
      eventBus.emit({
        type: 'charts/select-key',
        payload: {
          tableName,
          fieldName,
          key: value,
          isNoDataKey,
        },
      });
    },
    [eventBus]
  );

  const onSelectChart = useCallback(
    (tableName: string) => {
      if (!api) return;

      const table = tableStructureRef.current.find(
        (t) => t.tableName === tableName
      );
      if (!table) return;

      const { startCol, startRow, endCol, endRow } = table;
      api.updateSelection({ startCol, startRow, endCol, endRow });
    },
    [api]
  );

  const handleStartMoveChart = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (!api) return;

      const mousePosition = getMousePosition(e);
      if (!mousePosition) return;

      const { x, y } = mousePosition;
      const { col, row } = api.getCellFromCoords(x, y);
      const cell = api.getCell(col, row);
      if (!cell) return;

      api.event.emit({
        type: GridEvent.moveChartOrTable,
        cell,
        x,
        y,
      });
    },
    [api]
  );

  const onChartDblClick = useCallback(() => {
    eventBus.emit({ type: 'charts/dblclick' });
  }, [eventBus]);

  const handleContextMenu = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      chartConfig: ChartConfig
    ) => {
      e.preventDefault();
      const mousePosition = getMousePosition(e);

      if (!api || !mousePosition) return;

      api.openContextMenuAtCoords(
        mousePosition.x,
        mousePosition.y,
        chartConfig.gridChart.tableStartCol,
        chartConfig.gridChart.tableStartRow,
        'html-element'
      );
    },
    [api]
  );

  const handleDeleteChart = useCallback(
    (tableName: string) => {
      eventBus.emit({
        type: 'tables/delete',
        payload: { tableName },
      });
    },
    [eventBus]
  );

  const handleTableRename = useCallback(
    (oldName: string, newName: string) => {
      eventBus.emit({
        type: 'tables/rename',
        payload: {
          oldName,
          newName,
        },
      });
    },
    [eventBus]
  );

  useEffect(() => {
    if (!api) return;

    const startMoveModeSubscription = api.events$
      .pipe(
        filterByTypeAndCast<EventTypeStartMoveMode>(GridEvent.startMoveMode)
      )
      .subscribe(() => setMoveMode(true));

    const stopMoveModeSubscription = api.events$
      .pipe(filterByTypeAndCast<EventTypeStopMoveMode>(GridEvent.stopMoveMode))
      .subscribe(() => setMoveMode(false));

    const startMoveEntitySubscription = api.events$
      .pipe(
        filterByTypeAndCast<EventTypeStartMoveEntity>(GridEvent.startMoveEntity)
      )
      .subscribe(() => setMoveEntity(true));

    const stopMoveEntitySubscription = api.events$
      .pipe(
        filterByTypeAndCast<EventTypeStopMoveMode>(GridEvent.stopMoveEntity)
      )
      .subscribe(() => setMoveEntity(false));

    return () => {
      startMoveModeSubscription.unsubscribe();
      stopMoveModeSubscription.unsubscribe();
      startMoveEntitySubscription.unsubscribe();
      stopMoveEntitySubscription.unsubscribe();
    };
  }, [api]);

  return {
    moveMode,
    moveEntity,
    handleChartResize,
    onLoadMoreKeys,
    onSelectKey,
    onSelectChart,
    handleStartMoveChart,
    onChartDblClick,
    handleContextMenu,
    handleDeleteChart,
    handleTableRename,
  };
}
