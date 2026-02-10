import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Edges, GridApi, GridTable } from '../../../types';
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
  apiRef: RefObject<GridApi | null>;
  eventBus: GridEventBus;
  tableStructure: GridTable[];
};

export function useChartInteractions({
  apiRef,
  eventBus,
  tableStructure,
}: Args) {
  const [moveMode, setMoveMode] = useState(false);
  const [moveEntity, setMoveEntity] = useState(false);
  const [selection, setSelection] = useState<Edges | null>(null);
  const tableStructureRef = useRef<GridTable[]>(tableStructure);

  useEffect(() => {
    tableStructureRef.current = tableStructure;
  }, [tableStructure]);

  const handleChartResize = useCallback(
    (tableName: string, cols: number, rows: number) => {
      const api = apiRef.current;
      if (!api) return;

      eventBus.emit({
        type: 'charts/resize',
        payload: { tableName, cols, rows },
      });
    },
    [apiRef, eventBus],
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
      const api = apiRef.current;
      if (!api) return;

      const table = tableStructureRef.current.find(
        (t) => t.tableName === tableName,
      );
      if (!table) return;

      const { startCol, startRow, endCol, endRow } = table;
      api.updateSelection({ startCol, startRow, endCol, endRow });
    },
    [apiRef],
  );

  const handleStartMoveChart = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      const api = apiRef.current;
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
    [apiRef],
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
      const api = apiRef.current;
      const mousePosition = getMousePosition(e);

      if (!api || !mousePosition) return;

      api.openContextMenuAtCoords(
        mousePosition.x,
        mousePosition.y,
        chartConfig.gridChart.tableStartCol,
        chartConfig.gridChart.tableStartRow,
        'html-element',
      );
    },
    [apiRef],
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
    if (!selection) return null;

    return chartByEdges.get(edgesKey(selection)) ?? null;
  }, [selection, chartByEdges]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;

    api.setSelectedChart(selectedChartName);
  }, [apiRef, selectedChartName]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;

    const startMoveModeSubscription = api.events$
      .pipe(
        filterByTypeAndCast<EventTypeStartMoveMode>(GridEvent.startMoveMode),
      )
      .subscribe(() => setMoveMode(true));

    const stopMoveModeSubscription = api.events$
      .pipe(filterByTypeAndCast<EventTypeStopMoveMode>(GridEvent.stopMoveMode))
      .subscribe(() => setMoveMode(false));

    const startMoveEntitySubscription = api.events$
      .pipe(
        filterByTypeAndCast<EventTypeStartMoveEntity>(
          GridEvent.startMoveEntity,
        ),
      )
      .subscribe(() => setMoveEntity(true));

    const stopMoveEntitySubscription = api.events$
      .pipe(
        filterByTypeAndCast<EventTypeStopMoveMode>(GridEvent.stopMoveEntity),
      )
      .subscribe(() => setMoveEntity(false));

    const selectionSubscription = api.selection$.subscribe((selection) => {
      setSelection(selection);
    });

    return () => {
      startMoveModeSubscription.unsubscribe();
      stopMoveModeSubscription.unsubscribe();
      startMoveEntitySubscription.unsubscribe();
      stopMoveEntitySubscription.unsubscribe();
      selectionSubscription.unsubscribe();
    };
  }, [apiRef]);

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
