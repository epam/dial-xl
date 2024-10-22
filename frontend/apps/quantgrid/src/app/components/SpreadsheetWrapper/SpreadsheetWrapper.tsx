import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { debounce } from 'ts-debounce';

import {
  CanvasSpreadsheet,
  SelectionEdges,
} from '@frontend/canvas-spreadsheet';
import { CachedViewport, GridData, GridTable } from '@frontend/common';
import {
  Grid,
  GridCellEditorMode,
  GridSelection,
  GridService,
  SelectedCell,
  Spreadsheet,
} from '@frontend/spreadsheet';

import {
  AppContext,
  CanvasSpreadsheetContext,
  chunkSize,
  InputsContext,
  ProjectContext,
  SpreadsheetContext,
  UndoRedoContext,
  ViewportContext,
} from '../../context';
import {
  useApplyFilterManualEditDSL,
  useApplySortManualEditDSL,
  useCharts,
  useColumnSizes,
  useCreateTableAction,
  useManualAddTableRowDSL,
  useManualArrangeTableDSL,
  useManualCreateEntityDSL,
  useManualDeleteTableDSL,
  useManualEditDSL,
  useManualPasteCellsDSL,
  useOpenInEditor,
  useOverridesManualEditDSL,
  usePointClickSelectValue,
  usePromoteRowManualEditDSL,
  useRequestDimTable,
  useSelectedCell,
  useSelectionSystemMessage,
  useSubmitCellEditor,
  useTotalManualEditDSL,
} from '../../hooks';
import useEventBus from '../../hooks/useEventBus';
import { EventBusMessages } from '../../services';
import { useApplySuggestions } from '../ChatWrapper/useApplySuggestion';

export function SpreadsheetWrapper() {
  const { viewGridData } = useContext(ViewportContext);
  const { onSpreadsheetMount, gridApi } = useContext(SpreadsheetContext);
  const { inputList } = useContext(InputsContext);
  const { undo } = useContext(UndoRedoContext);

  const {
    zoom,
    theme,
    formulaBarMode,
    setEditMode,
    isPointClickMode,
    switchPointClickMode,
    canvasSpreadsheetMode,
  } = useContext(AppContext);

  const {
    functions,
    projectName,
    sheetName,
    parsedSheets,
    updateSelectedCell,
    openStatusModal,
    sheetContent,
    projectSheets,
    getCurrentProjectViewport,
    updateIsAIPendingChanges,
    updateIsAIPendingBanner,
    openSheet,
  } = useContext(ProjectContext);

  const gridApiRef = useContext(CanvasSpreadsheetContext);
  const firstViewportChange = useRef(true);

  const [tableStructure, setTableStructure] = useState<GridTable[]>([]);

  const [data, setData] = useState<GridData>({});

  const viewportRef = useRef<CachedViewport>({
    startRow: 1,
    endRow: 1,
  });

  const { publish } = useEventBus<EventBusMessages>();
  const { expandDimTable, showRowReference } = useRequestDimTable();
  const { submitCellEditor } = useSubmitCellEditor();
  const { columnSizes } = useColumnSizes(viewportRef.current);
  const { handlePointClickSelectValue } = usePointClickSelectValue();
  const { promoteRow } = usePromoteRowManualEditDSL();
  const { addOverride, editOverride, removeOverride } =
    useOverridesManualEditDSL();
  const { changeFieldSort } = useApplySortManualEditDSL();
  const { applySuggestion } = useApplySuggestions();
  const { applyListFilter, applyNumberFilter } = useApplyFilterManualEditDSL();
  const {
    addChart,
    addDimension,
    addKey,
    chartResize,
    convertToChart,
    convertToTable,
    deleteField,
    deleteSelectedFieldOrTable,
    editExpression,
    editExpressionWithOverrideRemove,
    moveTable,
    addField,
    removeNote,
    removeDimension,
    moveTableTo,
    removeKey,
    renameField,
    renameTable,
    updateNote,
    swapFields,
    onIncreaseFieldColumnSize,
    onDecreaseFieldColumnSize,
    onChangeFieldColumnSize,
    onToggleTableHeaderVisibility,
    onToggleTableFieldsVisibility,
    onFlipTable,
    onCloneTable,
    onRemoveRow,
  } = useManualEditDSL();
  const {
    editTotalExpression,
    addTotalExpression,
    removeTotalByType,
    removeTotalByIndex,
    toggleTotalByType,
  } = useTotalManualEditDSL();
  const { arrangeTable } = useManualArrangeTableDSL();
  const { deleteTable } = useManualDeleteTableDSL();
  const { createDerivedTable, createManualTable } = useManualCreateEntityDSL();
  const { addTableRow, addTableRowToEnd } = useManualAddTableRowDSL();
  const { pasteCells } = useManualPasteCellsDSL();
  const { getMoreChartKeys, selectChartKey, chartData, charts } = useCharts();
  const { openInEditor } = useOpenInEditor();
  const { onCreateTableAction } = useCreateTableAction();
  const { getSelectedCell } = useSelectedCell();
  const { systemMessageContent } = useSelectionSystemMessage();
  const isCalculateRequested = useRef(false);

  const onEditExpression = useCallback(
    (tableName: string, fieldName: string, expression: string) => {
      editExpression(tableName, fieldName, expression);

      if (canvasSpreadsheetMode) {
        gridApiRef?.current?.hideCellEditor();
      } else {
        gridApi?.hideCellEditor();
      }
    },
    [canvasSpreadsheetMode, editExpression, gridApi, gridApiRef]
  );

  const onCloseTable = useCallback(
    (tableName: string) => {
      deleteTable(tableName);
    },
    [deleteTable]
  );

  const onRenameField = useCallback(
    (tableName: string, oldName: string, newName: string) => {
      renameField(tableName, oldName, newName);

      if (canvasSpreadsheetMode) {
        gridApiRef?.current?.hideCellEditor();
      } else {
        gridApi?.hideCellEditor();
      }
    },
    [canvasSpreadsheetMode, gridApi, gridApiRef, renameField]
  );

  const onRenameTable = useCallback(
    (oldName: string, newName: string) => {
      renameTable(oldName, newName);

      if (canvasSpreadsheetMode) {
        gridApiRef?.current?.hideCellEditor();
      } else {
        gridApi?.hideCellEditor();
      }
    },
    [canvasSpreadsheetMode, gridApi, gridApiRef, renameTable]
  );

  const onCellEditorUpdateValue = useCallback(
    (value: string, cancelEdit: boolean, dimFieldName?: string) => {
      publish({
        topic: 'CellEditorUpdateValue',
        payload: { value, cancelEdit, dimFieldName },
      });
    },
    [publish]
  );

  const onCellEditorChangeEditMode = useCallback(
    (editMode: GridCellEditorMode) => {
      setEditMode(editMode);
    },
    [setEditMode]
  );

  const onCellEditorMessage = useCallback(
    (message: string) => {
      openStatusModal(message);
    },
    [openStatusModal]
  );

  const onSelectionChange = useCallback(
    (selection: SelectedCell | null) => {
      updateSelectedCell(selection);
    },
    [updateSelectedCell]
  );

  const onCanvasSelectionChange = useCallback(
    (selectionEdges: SelectionEdges | null) => {
      updateSelectedCell(getSelectedCell(selectionEdges, data));
    },
    [data, getSelectedCell, updateSelectedCell]
  );

  const onStartPointClick = useCallback(() => {
    switchPointClickMode(true, 'cell-editor');
  }, [switchPointClickMode]);

  const onStopPointClick = useCallback(() => {
    switchPointClickMode(false);
  }, [switchPointClickMode]);

  const onPointClickSelectValue = useCallback(
    (pointClickSelection: GridSelection | null) => {
      handlePointClickSelectValue(null, pointClickSelection);
    },
    [handlePointClickSelectValue]
  );

  const onUndo = useCallback(() => {
    undo();
  }, [undo]);

  const onMount = useCallback(
    (gridApi: Grid, gridService: GridService) => {
      onSpreadsheetMount(gridApi, gridService);
    },
    [onSpreadsheetMount]
  );

  const onScroll = useCallback(
    (
      startCol: number,
      endCol: number,
      startRow: number,
      endRow: number,
      forceRequest?: boolean
    ) => {
      if (!projectName || !sheetName || !sheetContent || !projectSheets) return;

      viewportRef.current = { startRow, endRow };

      const viewportRequest = viewGridData.buildViewportsToRequest({
        startCol,
        endCol,
        startRow,
        endRow,
      });

      if (viewportRequest.length === 0 && !forceRequest) return;

      isCalculateRequested.current = true;
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

  const onGetFieldFilterList = useCallback(
    (tableName: string, fieldName: string) => {
      return viewGridData.getFieldFilterList(tableName, fieldName);
    },
    [viewGridData]
  );

  useEffect(() => {
    if (!sheetName || !projectName) return;

    if (canvasSpreadsheetMode) {
      gridApiRef?.current?.clearSelection();
    } else {
      gridApi?.clearSelection();
      gridApi?.clearViewportScroll();
    }
  }, [sheetName, projectName, gridApi, canvasSpreadsheetMode, gridApiRef]);

  const triggerOnScroll = useCallback(
    (forceRequest: boolean) => {
      let gridViewport: SelectionEdges | undefined;

      if (canvasSpreadsheetMode && gridApiRef?.current) {
        gridViewport = gridApiRef.current.getViewportEdges();
      } else if (gridApi) {
        const [startRow, endRow] = gridApi.rowEdges;
        const [startCol, endCol] = gridApi.colEdges;

        gridViewport = { startRow, endRow, startCol, endCol };
      }
      if (!gridViewport) return;

      const { startRow, endRow, startCol, endCol } = gridViewport;
      const normalizedEndRow =
        endRow && endRow < 10 ? chunkSize : endRow || chunkSize;

      const normalizedEndCol = endCol < 10 ? 100 : endCol;

      onScroll(
        startCol,
        normalizedEndCol,
        startRow,
        normalizedEndRow,
        forceRequest
      );
    },
    [canvasSpreadsheetMode, gridApi, gridApiRef, onScroll]
  );

  useEffect(() => {
    if (
      !projectName ||
      !sheetName ||
      !sheetContent ||
      !gridApi ||
      canvasSpreadsheetMode
    )
      return;

    triggerOnScroll(!isCalculateRequested.current);

    isCalculateRequested.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gridApi,
    viewGridData,
    projectSheets,
    sheetContent,
    parsedSheets,
    inputList,
    triggerOnScroll,
  ]);

  useEffect(() => {
    if (!gridApiRef?.current) return;

    const gridApi = gridApiRef.current;

    const onViewportChange = debounce((deltaX: number, deltaY: number) => {
      triggerOnScroll(firstViewportChange.current);

      if (firstViewportChange.current) {
        firstViewportChange.current = false;
      }
    }, 100);

    const unsubscribe = gridApi.gridViewportSubscription(onViewportChange);

    onViewportChange(0, 0);

    return () => {
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridApiRef?.current, onScroll, triggerOnScroll]);

  useEffect(() => {
    if (!projectName) return;

    const handleDataUpdate = () => {
      setData(viewGridData.toGridData());
      setTableStructure(viewGridData.getGridTableStructure());
    };

    // init data update call, if component had unmounted
    handleDataUpdate();

    const dataUpdateSubscription =
      viewGridData.shouldUpdate$.subscribe(handleDataUpdate);

    return () => {
      dataUpdateSubscription.unsubscribe();
    };
  }, [projectName, setData, viewGridData]);

  useEffect(() => {
    if (!projectName) return;

    const handleDataUpdate = () => {
      let selection: SelectionEdges | null = null;

      if (canvasSpreadsheetMode && gridApiRef?.current) {
        selection = gridApiRef.current.getSelection();
      } else if (!canvasSpreadsheetMode && gridApi) {
        selection = gridApi.getSelection();
      }

      if (!selection) return;

      updateSelectedCell(getSelectedCell(selection, viewGridData.toGridData()));
    };

    const dataUpdateSubscription =
      viewGridData.shouldUpdate$.subscribe(handleDataUpdate);

    return () => {
      dataUpdateSubscription.unsubscribe();
    };
  }, [
    canvasSpreadsheetMode,
    data,
    getSelectedCell,
    gridApi,
    gridApiRef,
    projectName,
    setData,
    updateSelectedCell,
    viewGridData,
  ]);

  useEffect(() => {
    if (!projectName) return;

    const handleDynamicFieldsRequest = () => {
      triggerOnScroll(false);
    };

    const subscription = viewGridData.tableDynamicFieldsRequest$.subscribe(
      handleDynamicFieldsRequest
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [gridApi, onScroll, projectName, setData, triggerOnScroll, viewGridData]);

  if (canvasSpreadsheetMode) {
    return (
      <CanvasSpreadsheet
        chartData={chartData}
        charts={charts}
        columnSizes={columnSizes}
        currentSheetName={sheetName}
        data={data}
        formulaBarMode={formulaBarMode}
        functions={functions}
        inputFiles={inputList}
        isPointClickMode={isPointClickMode}
        parsedSheets={parsedSheets}
        ref={gridApiRef}
        sheetContent={sheetContent || ''}
        systemMessageContent={systemMessageContent}
        tableStructure={tableStructure}
        theme={theme}
        zoom={zoom}
        onAddChart={addChart}
        onAddDimension={addDimension}
        onAddField={addField}
        onAddKey={addKey}
        onAddOverride={addOverride}
        onAddTableRow={addTableRow}
        onAddTotalExpression={addTotalExpression}
        onAIPendingBanner={updateIsAIPendingBanner}
        onAIPendingChanges={updateIsAIPendingChanges}
        onApplyListFilter={applyListFilter}
        onApplyNumericFilter={applyNumberFilter}
        onApplySuggestion={applySuggestion}
        onArrangeTable={arrangeTable}
        onCellEditorChangeEditMode={onCellEditorChangeEditMode}
        onCellEditorMessage={onCellEditorMessage}
        onCellEditorSubmit={submitCellEditor}
        onCellEditorUpdateValue={onCellEditorUpdateValue}
        onChangeFieldColumnSize={onChangeFieldColumnSize}
        onChartResize={chartResize}
        onCloneTable={onCloneTable}
        onCloseTable={onCloseTable}
        onConvertToChart={convertToChart}
        onConvertToTable={convertToTable}
        onCreateDerivedTable={createDerivedTable}
        onCreateManualTable={createManualTable}
        onDecreaseFieldColumnSize={onDecreaseFieldColumnSize}
        onDelete={deleteSelectedFieldOrTable}
        onDeleteField={deleteField}
        onDeleteTable={deleteTable}
        onDNDTable={moveTableTo}
        onEditExpression={onEditExpression}
        onEditExpressionWithOverrideRemove={editExpressionWithOverrideRemove}
        onEditOverride={editOverride}
        onEditTotalExpression={editTotalExpression}
        onExpandDimTable={expandDimTable}
        onFlipTable={onFlipTable}
        onGetFieldFilterList={onGetFieldFilterList}
        onGetMoreChartKeys={getMoreChartKeys}
        onIncreaseFieldColumnSize={onIncreaseFieldColumnSize}
        onMoveTable={moveTable}
        onOpenInEditor={openInEditor}
        onOpenSheet={openSheet}
        onPaste={pasteCells}
        onPointClickSelectValue={onPointClickSelectValue}
        onRemoveDimension={removeDimension}
        onRemoveKey={removeKey}
        onRemoveNote={removeNote}
        onRemoveOverride={removeOverride}
        onRemoveTotalByIndex={removeTotalByIndex}
        onRemoveTotalByType={removeTotalByType}
        onRenameField={onRenameField}
        onRenameTable={onRenameTable}
        onScroll={onScroll}
        onSelectChartKey={selectChartKey}
        onSelectionChange={onCanvasSelectionChange}
        onShowRowReference={showRowReference}
        onSortChange={changeFieldSort}
        onStartPointClick={onStartPointClick}
        onStopPointClick={onStopPointClick}
        onSwapFields={swapFields}
        onToggleTableFieldsVisibility={onToggleTableFieldsVisibility}
        onToggleTableHeaderVisibility={onToggleTableHeaderVisibility}
        onToggleTotalByType={toggleTotalByType}
        onUndo={onUndo}
        onUpdateNote={updateNote}
      />
    );
  }

  return (
    <Spreadsheet
      chartData={chartData}
      charts={charts}
      columnSizes={columnSizes}
      currentSheetName={sheetName}
      data={data}
      formulaBarMode={formulaBarMode}
      functions={functions}
      inputFiles={inputList}
      isPointClickMode={isPointClickMode}
      parsedSheets={parsedSheets}
      sheetContent={sheetContent || ''}
      systemMessageContent={systemMessageContent}
      tableStructure={tableStructure}
      theme={theme}
      zoom={zoom}
      onAddChart={addChart}
      onAddDimension={addDimension}
      onAddField={addField}
      onAddKey={addKey}
      onAddOverride={addOverride}
      onAddTableRow={addTableRow}
      onAddTableRowToEnd={addTableRowToEnd}
      onAddTotalExpression={addTotalExpression}
      onAIPendingBanner={updateIsAIPendingBanner}
      onAIPendingChanges={updateIsAIPendingChanges}
      onApplyListFilter={applyListFilter}
      onApplyNumericFilter={applyNumberFilter}
      onApplySuggestion={applySuggestion}
      onArrangeTable={arrangeTable}
      onCellEditorChangeEditMode={onCellEditorChangeEditMode}
      onCellEditorMessage={onCellEditorMessage}
      onCellEditorSubmit={submitCellEditor}
      onCellEditorUpdateValue={onCellEditorUpdateValue}
      onChangeFieldColumnSize={onChangeFieldColumnSize}
      onChartResize={chartResize}
      onCloneTable={onCloneTable}
      onCloseTable={onCloseTable}
      onConvertToChart={convertToChart}
      onConvertToTable={convertToTable}
      onCreateDerivedTable={createDerivedTable}
      onCreateManualTable={createManualTable}
      onCreateTableAction={onCreateTableAction}
      onDecreaseFieldColumnSize={onDecreaseFieldColumnSize}
      onDelete={deleteSelectedFieldOrTable}
      onDeleteField={deleteField}
      onDeleteTable={deleteTable}
      onDNDTable={moveTableTo}
      onEditExpression={onEditExpression}
      onEditExpressionWithOverrideRemove={editExpressionWithOverrideRemove}
      onEditOverride={editOverride}
      onEditTotalExpression={editTotalExpression}
      onExpandDimTable={expandDimTable}
      onFlipTable={onFlipTable}
      onGetFieldFilterList={onGetFieldFilterList}
      onGetMoreChartKeys={getMoreChartKeys}
      onIncreaseFieldColumnSize={onIncreaseFieldColumnSize}
      onMount={onMount}
      onMoveTable={moveTable}
      onOpenInEditor={openInEditor}
      onOpenSheet={openSheet}
      onPaste={pasteCells}
      onPointClickSelectValue={onPointClickSelectValue}
      onPromoteRow={promoteRow}
      onRemoveDimension={removeDimension}
      onRemoveKey={removeKey}
      onRemoveNote={removeNote}
      onRemoveOverride={removeOverride}
      onRemoveOverrideRow={onRemoveRow}
      onRemoveTotalByIndex={removeTotalByIndex}
      onRemoveTotalByType={removeTotalByType}
      onRenameField={onRenameField}
      onRenameTable={onRenameTable}
      onScroll={onScroll}
      onSelectChartKey={selectChartKey}
      onSelectionChange={onSelectionChange}
      onShowRowReference={showRowReference}
      onSortChange={changeFieldSort}
      onStartPointClick={onStartPointClick}
      onStopPointClick={onStopPointClick}
      onSwapFields={swapFields}
      onToggleTableFieldsVisibility={onToggleTableFieldsVisibility}
      onToggleTableHeaderVisibility={onToggleTableHeaderVisibility}
      onToggleTotalByType={toggleTotalByType}
      onUndo={onUndo}
      onUpdateNote={updateNote}
    />
  );
}
