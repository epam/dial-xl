import { MouseEvent, useCallback, useEffect, useRef } from 'react';

import { infiniteScrollPlugin } from '@deltix/grid-it';
import {
  ChartData,
  FunctionInfo,
  ParsedSheets,
  TableData,
} from '@frontend/common';

import {
  Charts,
  ContextMenu,
  HandleContextMenuFunctionRef,
} from './components';
import { CellEditor } from './components';
import { defaults } from './defaults';
import { Grid, GridChart, GridData, GridTable } from './grid';
import { options } from './gridConfig';
import { useGridEvents } from './hooks';
import { GridService } from './services';
import styles from './Spreadsheet.module.scss';
import { GridCallbacks } from './types';

import './overrides.scss';

type Props = {
  data: GridData;
  chartKeys: TableData;
  chartData: ChartData;
  tableStructure: GridTable[];
  columnSizes: Record<string, number>;

  onScroll: GridCallbacks['onScroll'];
  onSelectionChange: GridCallbacks['onSelectionChange'];

  onMount: (gridApi: Grid, gridService: GridService) => void;
  zoom?: number;
  functions: FunctionInfo[];
  parsedSheets: ParsedSheets;
  charts?: GridChart[];
} & GridCallbacks;

export function Spreadsheet({
  onAddChart,
  onAddOverride,
  onEditOverride,
  chartData,
  chartKeys,
  columnSizes,
  data,
  onAddDimension,
  onAddKey,
  onCellEditorMessage,
  onCellEditorSubmit,
  onCellEditorUpdateValue,
  onChartResize,
  onConvertToChart,
  onConvertToTable,
  onCreateDerivedTable,
  onDeleteField,
  onDeleteTable,
  onEditExpression,
  onExpandDimTable,
  onGetMoreChartKeys,
  onMount,
  onMoveTable,
  onRemoveDimension,
  onRemoveKey,
  onRemoveOverride,
  onRenameField,
  onRenameTable,
  onScroll,
  onSelectionChange,
  onSelectChartKey,

  onCloseTable,
  onSwapFields,
  tableStructure,
  onDNDTable,
  zoom,
  functions,
  parsedSheets,
  charts,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const apiRef = useRef<Grid | null>(null);

  const gridServiceRef = useRef<GridService | null>(null);
  const gridCallbacksRef = useRef<GridCallbacks>({});

  useEffect(() => {
    if (!containerRef.current || apiRef.current) return;

    const api = new Grid(containerRef.current, {
      ...options,
      plugins: [
        infiniteScrollPlugin({
          triggerArea: 0.7,
        }),
      ],
    });

    apiRef.current = api;

    gridServiceRef.current = new GridService(api);
    onMount(apiRef.current, gridServiceRef.current);
  }, [onMount]);

  useEffect(() => {
    const api = apiRef.current;

    if (!api) return;

    api.updateColumnSizes(columnSizes, zoom || 1);
    api.hideCellEditor();
  }, [columnSizes, zoom]);

  useEffect(() => {
    gridCallbacksRef.current.onScroll = onScroll;
    gridCallbacksRef.current.onSelectionChange = onSelectionChange;
    gridCallbacksRef.current.onRenameTable = onRenameTable;
    gridCallbacksRef.current.onRenameField = onRenameField;
    gridCallbacksRef.current.onEditExpression = onEditExpression;
    gridCallbacksRef.current.onMoveTable = onMoveTable;
    gridCallbacksRef.current.onDeleteField = onDeleteField;
    gridCallbacksRef.current.onDeleteTable = onDeleteTable;
    gridCallbacksRef.current.onSwapFields = onSwapFields;
    gridCallbacksRef.current.onRemoveDimension = onRemoveDimension;
    gridCallbacksRef.current.onAddKey = onAddKey;
    gridCallbacksRef.current.onRemoveKey = onRemoveKey;
    gridCallbacksRef.current.onAddDimension = onAddDimension;
    gridCallbacksRef.current.onCreateDerivedTable = onCreateDerivedTable;
    gridCallbacksRef.current.onCellEditorSubmit = onCellEditorSubmit;
    gridCallbacksRef.current.onRemoveOverride = onRemoveOverride;
    gridCallbacksRef.current.onAddOverride = onAddOverride;
    gridCallbacksRef.current.onEditOverride = onEditOverride;
    gridCallbacksRef.current.onCellEditorUpdateValue = onCellEditorUpdateValue;
    gridCallbacksRef.current.onCellEditorMessage = onCellEditorMessage;
    gridCallbacksRef.current.onDNDTable = onDNDTable;
    gridCallbacksRef.current.onExpandDimTable = onExpandDimTable;
    gridCallbacksRef.current.onCloseTable = onCloseTable;
    gridCallbacksRef.current.onChartResize = onChartResize;
    gridCallbacksRef.current.onGetMoreChartKeys = onGetMoreChartKeys;
    gridCallbacksRef.current.onSelectChartKey = onSelectChartKey;
    gridCallbacksRef.current.onAddChart = onAddChart;
    gridCallbacksRef.current.onConvertToChart = onConvertToChart;
    gridCallbacksRef.current.onConvertToTable = onConvertToTable;
  }, [
    onAddChart,
    onAddDimension,
    onAddKey,
    onAddOverride,
    onCellEditorMessage,
    onCellEditorSubmit,
    onCellEditorUpdateValue,
    onChartResize,
    onConvertToChart,
    onConvertToTable,
    onCreateDerivedTable,
    onDNDTable,
    onDeleteField,
    onDeleteTable,
    onEditExpression,
    onEditOverride,
    onGetMoreChartKeys,
    onMoveTable,
    onRemoveDimension,
    onRemoveKey,
    onRemoveOverride,
    onRenameField,
    onRenameTable,
    onScroll,
    onSelectionChange,
    onExpandDimTable,
    onSelectChartKey,
    onSwapFields,
    onCloseTable,
  ]);

  useEffect(() => {
    if (!gridServiceRef.current || !apiRef.current) return;

    gridServiceRef.current.setData(data);

    apiRef.current.updateSelectionAfterDataChange();
  }, [data]);

  useEffect(() => {
    if (!gridServiceRef.current) return;

    gridServiceRef.current.setTableStructure(tableStructure);
  }, [tableStructure]);

  useEffect(() => {
    const api = apiRef.current;
    const container = containerRef.current;

    if (!api || !container) return;

    api.setZoom(zoom ?? 1);
    container.style.fontSize =
      Math.floor(defaults.cell.fontSize * (zoom ?? 1)) + 'px';
  }, [zoom]);

  const handleContextMenu = useRef<HandleContextMenuFunctionRef | null>(null);

  const onContextMenu = useCallback((e: MouseEvent<HTMLDivElement>) => {
    handleContextMenu.current?.(e);
  }, []);

  useGridEvents(apiRef, gridServiceRef, gridCallbacksRef);

  return (
    <>
      <ContextMenu
        api={apiRef.current}
        gridCallbacksRef={gridCallbacksRef}
        gridServiceRef={gridServiceRef}
        handleContextMenu={handleContextMenu}
      />
      <CellEditor
        api={apiRef.current}
        functions={functions}
        gridCallbacksRef={gridCallbacksRef}
        parsedSheets={parsedSheets}
        zoom={zoom}
      />
      <Charts
        api={apiRef.current}
        chartData={chartData}
        chartKeys={chartKeys}
        charts={charts}
        gridCallbacksRef={gridCallbacksRef}
        zoom={zoom}
      />
      <div
        className={styles.container}
        ref={containerRef}
        tabIndex={-1}
        onContextMenu={onContextMenu}
      />
    </>
  );
}
