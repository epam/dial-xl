import { MouseEvent, useCallback, useEffect, useRef } from 'react';

import { infiniteScrollPlugin } from '@deltix/grid-it';
import {
  AppTheme,
  ChartsData,
  FilesMetadata,
  FormulaBarMode,
  FunctionInfo,
  GridChart,
  GridData,
  GridTable,
  SystemMessageParsedContent,
} from '@frontend/common';
import { ParsedSheets } from '@frontend/parser';

import {
  AIPrompt,
  Charts,
  ContextMenu,
  HandleContextMenuFunctionRef,
  Note,
  Tooltip,
} from './components';
import { CellEditor } from './components';
import { defaults } from './defaults';
import { Grid } from './grid';
import { options } from './gridConfig';
import { useGridEvents } from './hooks';
import { GridService } from './services';
import { GridCallbacks } from './types';

import './overrides.scss';

type Props = {
  data: GridData;
  chartData: ChartsData;
  tableStructure: GridTable[];
  columnSizes: Record<string, number>;

  onScroll: GridCallbacks['onScroll'];
  onSelectionChange: GridCallbacks['onSelectionChange'];

  onMount: (gridApi: Grid, gridService: GridService) => void;
  zoom?: number;
  functions: FunctionInfo[];
  parsedSheets: ParsedSheets;
  inputFiles: FilesMetadata[] | null;
  charts?: GridChart[];
  theme: AppTheme;
  formulaBarMode: FormulaBarMode;
  isPointClickMode: boolean;
  systemMessageContent: SystemMessageParsedContent | undefined;
  sheetContent: string;
  currentSheetName: string | null;
} & GridCallbacks;

export function Spreadsheet({
  chartData,
  columnSizes,
  data,
  tableStructure,
  zoom,
  functions,
  inputFiles,
  parsedSheets,
  sheetContent,
  charts,
  theme,
  formulaBarMode,
  isPointClickMode,
  systemMessageContent,
  currentSheetName,
  onAddChart,
  onAddOverride,
  onEditOverride,
  onAddDimension,
  onAddKey,
  onAddTableRow,
  onApplyNumericFilter,
  onApplyListFilter,
  onCellEditorMessage,
  onCellEditorSubmit,
  onCellEditorUpdateValue,
  onCellEditorChangeEditMode,
  onChartResize,
  onConvertToChart,
  onAddField,
  onConvertToTable,
  onCreateDerivedTable,
  onDelete,
  onDeleteField,
  onDeleteTable,
  onEditExpression,
  onEditExpressionWithOverrideRemove,
  onExpandDimTable,
  onShowRowReference,
  onGetMoreChartKeys,
  onMount,
  onMoveTable,
  onPaste,
  onRemoveNote,
  onRemoveDimension,
  onRemoveKey,
  onRemoveOverride,
  onRenameField,
  onRenameTable,
  onScroll,
  onSelectionChange,
  onSelectChartKey,
  onUpdateNote,
  onStartPointClick,
  onStopPointClick,
  onPointClickSelectValue,
  onOpenInEditor,
  onCloseTable,
  onSortChange,
  onSwapFields,
  onIncreaseFieldColumnSize,
  onDecreaseFieldColumnSize,
  onChangeFieldColumnSize,
  onToggleTableHeaderVisibility,
  onToggleTableFieldsVisibility,
  onFlipTable,
  onRemoveTotalByType,
  onRemoveTotalByIndex,
  onToggleTotalByType,
  onAddTotalExpression,
  onEditTotalExpression,
  onGetFieldFilterList,
  onPromoteRow,
  onCreateTableAction,
  onDNDTable,
  onCloneTable,
  onCreateManualTable,
  onAddTableRowToEnd,
  onRemoveOverrideRow,
  onApplySuggestion,
  onUndo,
  onAIPendingChanges,
  onAIPendingBanner,
  onOpenSheet,
  onArrangeTable,
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
    const api = apiRef.current;

    if (!api) return;

    api.setIsPointClickMode(isPointClickMode);
  }, [isPointClickMode]);

  useEffect(() => {
    gridCallbacksRef.current.onScroll = onScroll;
    gridCallbacksRef.current.onSelectionChange = onSelectionChange;
    gridCallbacksRef.current.onRenameTable = onRenameTable;
    gridCallbacksRef.current.onRenameField = onRenameField;
    gridCallbacksRef.current.onEditExpression = onEditExpression;
    gridCallbacksRef.current.onEditExpressionWithOverrideRemove =
      onEditExpressionWithOverrideRemove;
    gridCallbacksRef.current.onMoveTable = onMoveTable;
    gridCallbacksRef.current.onDeleteField = onDeleteField;
    gridCallbacksRef.current.onDeleteTable = onDeleteTable;
    gridCallbacksRef.current.onSwapFields = onSwapFields;
    gridCallbacksRef.current.onIncreaseFieldColumnSize =
      onIncreaseFieldColumnSize;
    gridCallbacksRef.current.onDecreaseFieldColumnSize =
      onDecreaseFieldColumnSize;
    gridCallbacksRef.current.onChangeFieldColumnSize = onChangeFieldColumnSize;
    gridCallbacksRef.current.onRemoveDimension = onRemoveDimension;
    gridCallbacksRef.current.onAddKey = onAddKey;
    gridCallbacksRef.current.onRemoveKey = onRemoveKey;
    gridCallbacksRef.current.onAddDimension = onAddDimension;
    gridCallbacksRef.current.onCreateDerivedTable = onCreateDerivedTable;
    gridCallbacksRef.current.onCellEditorSubmit = onCellEditorSubmit;
    gridCallbacksRef.current.onRemoveOverride = onRemoveOverride;
    gridCallbacksRef.current.onAddOverride = onAddOverride;
    gridCallbacksRef.current.onAddTableRow = onAddTableRow;
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
    gridCallbacksRef.current.onPaste = onPaste;
    gridCallbacksRef.current.onAddField = onAddField;
    gridCallbacksRef.current.onRemoveNote = onRemoveNote;
    gridCallbacksRef.current.onUpdateNote = onUpdateNote;
    gridCallbacksRef.current.onStartPointClick = onStartPointClick;
    gridCallbacksRef.current.onStopPointClick = onStopPointClick;
    gridCallbacksRef.current.onPointClickSelectValue = onPointClickSelectValue;
    gridCallbacksRef.current.onOpenInEditor = onOpenInEditor;
    gridCallbacksRef.current.onDelete = onDelete;
    gridCallbacksRef.current.onToggleTableHeaderVisibility =
      onToggleTableHeaderVisibility;
    gridCallbacksRef.current.onToggleTableFieldsVisibility =
      onToggleTableFieldsVisibility;
    gridCallbacksRef.current.onSortChange = onSortChange;
    gridCallbacksRef.current.onApplyNumericFilter = onApplyNumericFilter;
    gridCallbacksRef.current.onFlipTable = onFlipTable;
    gridCallbacksRef.current.onApplyListFilter = onApplyListFilter;
    gridCallbacksRef.current.onCellEditorChangeEditMode =
      onCellEditorChangeEditMode;
    gridCallbacksRef.current.onRemoveTotalByType = onRemoveTotalByType;
    gridCallbacksRef.current.onRemoveTotalByIndex = onRemoveTotalByIndex;
    gridCallbacksRef.current.onToggleTotalByType = onToggleTotalByType;
    gridCallbacksRef.current.onAddTotalExpression = onAddTotalExpression;
    gridCallbacksRef.current.onEditTotalExpression = onEditTotalExpression;
    gridCallbacksRef.current.onGetFieldFilterList = onGetFieldFilterList;
    gridCallbacksRef.current.onCloneTable = onCloneTable;
    gridCallbacksRef.current.onPromoteRow = onPromoteRow;
    gridCallbacksRef.current.onShowRowReference = onShowRowReference;
    gridCallbacksRef.current.onCreateTableAction = onCreateTableAction;
    gridCallbacksRef.current.onCreateManualTable = onCreateManualTable;
    gridCallbacksRef.current.onAddTableRowToEnd = onAddTableRowToEnd;
    gridCallbacksRef.current.onRemoveOverrideRow = onRemoveOverrideRow;
    gridCallbacksRef.current.onApplySuggestion = onApplySuggestion;
    gridCallbacksRef.current.onUndo = onUndo;
    gridCallbacksRef.current.onAIPendingChanges = onAIPendingChanges;
    gridCallbacksRef.current.onAIPendingBanner = onAIPendingBanner;
    gridCallbacksRef.current.onOpenSheet = onOpenSheet;
    gridCallbacksRef.current.onArrangeTable = onArrangeTable;
  }, [
    onArrangeTable,
    onAIPendingChanges,
    onUndo,
    onApplySuggestion,
    onAddChart,
    onAddDimension,
    onCloneTable,
    onAddKey,
    onAddOverride,
    onAddTableRow,
    onApplyNumericFilter,
    onApplyListFilter,
    onCellEditorChangeEditMode,
    onCellEditorMessage,
    onCellEditorSubmit,
    onCellEditorUpdateValue,
    onChartResize,
    onConvertToChart,
    onConvertToTable,
    onCreateDerivedTable,
    onDNDTable,
    onDelete,
    onDeleteField,
    onDeleteTable,
    onEditExpression,
    onEditOverride,
    onGetFieldFilterList,
    onGetMoreChartKeys,
    onMoveTable,
    onPaste,
    onRemoveNote,
    onRemoveDimension,
    onRemoveKey,
    onRemoveOverride,
    onRenameField,
    onRenameTable,
    onSortChange,
    onScroll,
    onSelectionChange,
    onUpdateNote,
    onExpandDimTable,
    onShowRowReference,
    onSelectChartKey,
    onSwapFields,
    onIncreaseFieldColumnSize,
    onDecreaseFieldColumnSize,
    onCloseTable,
    onAddField,
    onChangeFieldColumnSize,
    onStartPointClick,
    onStopPointClick,
    onPointClickSelectValue,
    onOpenInEditor,
    onToggleTableHeaderVisibility,
    onToggleTableFieldsVisibility,
    onFlipTable,
    onEditExpressionWithOverrideRemove,
    onRemoveTotalByType,
    onRemoveTotalByIndex,
    onToggleTotalByType,
    onAddTotalExpression,
    onEditTotalExpression,
    onPromoteRow,
    onCreateTableAction,
    onCreateManualTable,
    onAddTableRowToEnd,
    onRemoveOverrideRow,
    onOpenSheet,
    onAIPendingBanner,
  ]);

  useEffect(() => {
    const api = apiRef.current;

    if (!api) return;

    api.setIsPointClickMode(isPointClickMode);
  }, [isPointClickMode]);

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

  useGridEvents(apiRef, gridServiceRef, gridCallbacksRef, zoom);

  return (
    <>
      <ContextMenu
        api={apiRef.current}
        functions={functions}
        gridCallbacksRef={gridCallbacksRef}
        gridServiceRef={gridServiceRef}
        handleContextMenu={handleContextMenu}
        inputFiles={inputFiles}
        parsedSheets={parsedSheets}
      />
      <CellEditor
        api={apiRef.current}
        formulaBarMode={formulaBarMode}
        functions={functions}
        gridCallbacksRef={gridCallbacksRef}
        gridServiceRef={gridServiceRef}
        parsedSheets={parsedSheets}
        sheetContent={sheetContent}
        theme={theme}
        zoom={zoom}
      />
      <Note
        api={apiRef.current}
        gridCallbacksRef={gridCallbacksRef}
        gridServiceRef={gridServiceRef}
        zoom={zoom}
      />
      <AIPrompt
        api={apiRef.current}
        currentSheetName={currentSheetName}
        gridCallbacksRef={gridCallbacksRef}
        gridServiceRef={gridServiceRef}
        systemMessageContent={systemMessageContent}
        zoom={zoom}
      />
      <Tooltip api={apiRef.current} gridServiceRef={gridServiceRef} />
      <Charts
        api={apiRef.current}
        chartData={chartData}
        charts={charts}
        gridCallbacksRef={gridCallbacksRef}
        theme={theme}
        zoom={zoom}
      />
      <div
        className="w-full h-full overflow-hidden bg-bgGridLayerMain focus:outline-none"
        ref={containerRef}
        tabIndex={-1}
        onContextMenu={onContextMenu}
      />
    </>
  );
}
