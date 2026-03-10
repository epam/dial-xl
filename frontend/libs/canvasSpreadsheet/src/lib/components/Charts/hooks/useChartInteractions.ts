import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { GridStateContext, GridViewportContext } from '../../../context';
import {
  EventTypeStartMoveEntity,
  EventTypeStartMoveMode,
  EventTypeStopMoveMode,
  GridEvent,
  GridTable,
} from '../../../types';
import {
  filterByTypeAndCast,
  getMousePosition,
  GridEventBus,
} from '../../../utils';
import { ChartConfig } from '../types';

type Args = {
  eventBus: GridEventBus;
  tableStructure: GridTable[];
};

export function useChartInteractions({ eventBus, tableStructure }: Args) {
  const {
    setSelectionEdges,
    event,
    getCell,
    openContextMenuAtCoords,
    setSelectedChart,
    events$,
    selectionEdges,
    canvasId,
  } = useContext(GridStateContext);
  const { getCellFromCoords } = useContext(GridViewportContext);
  const [moveMode, setMoveMode] = useState(false);
  const [moveEntity, setMoveEntity] = useState(false);
  const tableStructureRef = useRef<GridTable[]>(tableStructure);

  useEffect(() => {
    tableStructureRef.current = tableStructure;
  }, [tableStructure]);

  const handleChartResize = useCallback(
    (tableName: string, cols: number, rows: number) => {
      eventBus.emit({
        type: 'charts/resize',
        payload: { tableName, cols, rows },
      });
    },
    [eventBus],
  );

  const onLoadMoreKeys = useCallback(
    (tableName: string, fieldName: string) => {
      eventBus.emit({
        type: 'charts/get-keys',
        payload: { tableName, fieldName },
      });
    },
    [eventBus],
  );

  const onSelectKey = useCallback(
    (
      tableName: string,
      fieldName: string,
      value: string | string[],
      isNoDataKey = false,
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
    [eventBus],
  );

  const onSelectChart = useCallback(
    (tableName: string) => {
      const table = tableStructureRef.current.find(
        (t) => t.tableName === tableName,
      );
      if (!table) return;

      const { startCol, startRow, endCol, endRow } = table;
      setSelectionEdges({ startCol, startRow, endCol, endRow });
    },
    [setSelectionEdges],
  );

  const handleStartMoveChart = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      const mousePosition = getMousePosition(e, canvasId);
      if (!mousePosition) return;

      const { x, y } = mousePosition;
      const { col, row } = getCellFromCoords(x, y);
      const cell = getCell(col, row);
      if (!cell) return;

      event.emit({
        type: GridEvent.moveChartOrTable,
        cell,
        x,
        y,
      });
    },
    [canvasId, event, getCellFromCoords],
  );

  const onChartDblClick = useCallback(() => {
    eventBus.emit({ type: 'charts/dblclick' });
  }, [eventBus]);

  const handleContextMenu = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      chartConfig: ChartConfig,
    ) => {
      e.preventDefault();
      const mousePosition = getMousePosition(e, canvasId);

      if (!mousePosition) return;

      openContextMenuAtCoords(
        mousePosition.x,
        mousePosition.y,
        chartConfig.gridChart.tableStartCol,
        chartConfig.gridChart.tableStartRow,
        'html-element',
      );
    },
    [canvasId, openContextMenuAtCoords],
  );

  const handleDeleteChart = useCallback(
    (tableName: string) => {
      eventBus.emit({
        type: 'tables/delete',
        payload: { tableName },
      });
    },
    [eventBus],
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
    [eventBus],
  );

  // Keep a map of charts by their edges for a quick lookup
  const chartByEdges = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tableStructure) {
      if (!t.chartType) continue;
      map.set(edgesKey(t), t.tableName);
    }

    return map;
  }, [tableStructure]);

  // Determine the selected chart based on the selection and table structures
  const selectedChartName = useMemo(() => {
    if (!selectionEdges) return null;

    return chartByEdges.get(edgesKey(selectionEdges)) ?? null;
  }, [selectionEdges, chartByEdges]);

  useEffect(() => {
    setSelectedChart(selectedChartName);
  }, [selectedChartName, setSelectedChart]);

  useEffect(() => {
    const startMoveModeSubscription = events$
      .pipe(
        filterByTypeAndCast<EventTypeStartMoveMode>(GridEvent.startMoveMode),
      )
      .subscribe(() => setMoveMode(true));

    const stopMoveModeSubscription = events$
      .pipe(filterByTypeAndCast<EventTypeStopMoveMode>(GridEvent.stopMoveMode))
      .subscribe(() => setMoveMode(false));

    const startMoveEntitySubscription = events$
      .pipe(
        filterByTypeAndCast<EventTypeStartMoveEntity>(
          GridEvent.startMoveEntity,
        ),
      )
      .subscribe(() => setMoveEntity(true));

    const stopMoveEntitySubscription = events$
      .pipe(
        filterByTypeAndCast<EventTypeStopMoveMode>(GridEvent.stopMoveEntity),
      )
      .subscribe(() => setMoveEntity(false));

    return () => {
      startMoveModeSubscription.unsubscribe();
      stopMoveModeSubscription.unsubscribe();
      startMoveEntitySubscription.unsubscribe();
      stopMoveEntitySubscription.unsubscribe();
    };
  }, [events$, setMoveMode, setMoveEntity]);

  return {
    moveMode,
    moveEntity,
    selectedChartName,
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

function edgesKey(e: {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}) {
  return `${e.startRow}:${e.startCol}:${e.endRow}:${e.endCol}`;
}
