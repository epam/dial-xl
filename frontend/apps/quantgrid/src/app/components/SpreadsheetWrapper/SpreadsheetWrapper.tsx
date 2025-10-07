import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import isEqual from 'react-fast-compare';
import { debounce } from 'ts-debounce';

import {
  CanvasSpreadsheet,
  GridCellEditorMode,
  GridData,
  GridTable,
  SelectionEdges,
  ViewportEdges,
} from '@frontend/canvas-spreadsheet';
import { CachedViewport } from '@frontend/common';

import { PanelName } from '../../common';
import {
  AppContext,
  CanvasSpreadsheetContext,
  chunkSize,
  getExtendedRoundedBorders,
  InputsContext,
  LayoutContext,
  ProjectContext,
  UndoRedoContext,
  ViewportContext,
} from '../../context';
import {
  useChartEditDsl,
  useCharts,
  useColumnSizes,
  useCreateTableAction,
  useCreateTableDsl,
  useDeleteEntityDsl,
  useDownloadTable,
  useFieldEditDsl,
  useFilterEditDsl,
  useNoteEditDsl,
  useOpenInEditor,
  useOverridesEditDsl,
  usePasteCells,
  usePointClickSelectValue,
  usePromoteRow,
  useRequestDimTable,
  useSelectedCell,
  useSelectionSystemMessage,
  useSortEditDsl,
  useSubmitCellEditor,
  useTableEditDsl,
  useTotalEditDsl,
} from '../../hooks';
import { useAddTableRow } from '../../hooks/EditDsl/useAddTableRow';
import useEventBus from '../../hooks/useEventBus';
import { useFieldFilterValues } from '../../hooks/useFilterValues';
import { EventBusMessages } from '../../services';
import { BottomSheetBar } from '../BottomSheetBar';
import { useApplySuggestions } from '../ChatWrapper/useApplySuggestion';
import { SpreadsheetHighlight } from '../Project/SpreadsheetHighlight';

export function SpreadsheetWrapper() {
  const { viewGridData } = useContext(ViewportContext);
  const { inputList, onSwitchInput } = useContext(InputsContext);
  const { undo } = useContext(UndoRedoContext);
  const { openPanel, closeAllPanels } = useContext(LayoutContext);

  const {
    zoom,
    theme,
    formulaBarMode,
    setEditMode,
    isPointClickMode,
    switchPointClickMode,
    viewportInteractionMode,
    changePivotTableWizardMode,
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
    openSheet,
    isProjectEditable,
  } = useContext(ProjectContext);

  const gridApiRef = useContext(CanvasSpreadsheetContext);
  const firstViewportChange = useRef(true);

  const [tableStructure, setTableStructure] = useState<GridTable[]>([]);

  const [data, setData] = useState<GridData>({});

  const viewportRef = useRef<CachedViewport>({
    startRow: 1,
    endRow: 1,
  });

  const currentViewport = useRef<ViewportEdges | null>(null);
  const currentExtendedViewport = useRef<ViewportEdges | null>(null);

  const { publish } = useEventBus<EventBusMessages>();
  const { expandDimTable, showRowReference } = useRequestDimTable();
  const { submitCellEditor } = useSubmitCellEditor();
  const { columnSizes } = useColumnSizes(viewportRef.current);
  const { handlePointClickSelectValue } = usePointClickSelectValue();
  const { promoteRow } = usePromoteRow();
  const { changeFieldSort } = useSortEditDsl();
  const { applySuggestion } = useApplySuggestions();
  const { applyListFilter, applyConditionFilter } = useFilterEditDsl();
  const { deleteField, deleteSelectedFieldOrTable } = useDeleteEntityDsl();
  const {
    createAllTableTotals,
    createDerivedTable,
    createManualTable,
    createEmptyChartTable,
  } = useCreateTableDsl();
  const { addTableRow, addTableRowToEnd } = useAddTableRow();
  const { pasteCells } = usePasteCells();
  const {
    getMoreChartKeys,
    selectChartKey,
    sendChartKeyViewports,
    chartData,
    charts,
  } = useCharts();
  const { openInEditor } = useOpenInEditor();
  const { onCreateTableAction } = useCreateTableAction();
  const { getSelectedCell } = useSelectedCell();
  const { onUpdateFieldFilterList, filterList } = useFieldFilterValues();
  const { systemMessageContent } = useSelectionSystemMessage();
  const {
    addField,
    changeFieldKey,
    changeFieldIndex,
    changeFieldDescription,
    changeFieldDimension,
    onIncreaseFieldColumnSize,
    onDecreaseFieldColumnSize,
    onChangeFieldColumnSize,
    autoFitTableFields,
    removeFieldSizes,
  } = useFieldEditDsl();
  const {
    arrangeTable,
    cloneTable,
    convertToTable,
    deleteTable,
    flipTable,
    moveTable,
    moveTableTo,
    swapFieldsByDirection,
    toggleTableTitleOrHeaderVisibility,
  } = useTableEditDsl();
  const { removeOverride, removeTableOrOverrideRow } = useOverridesEditDsl();
  const { removeNote, updateNote } = useNoteEditDsl();
  const { addAllFieldTotals, removeTotalByIndex, toggleTotalByType } =
    useTotalEditDsl();
  const { addChart, chartResize, selectTableForChart, setChartType } =
    useChartEditDsl();
  const { downloadTable } = useDownloadTable();
  const isCalculateRequested = useRef(false);

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

  const onMessage = useCallback(
    (message: string) => {
      openStatusModal(message);
    },
    [openStatusModal]
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
    (pointClickSelection: SelectionEdges | null) => {
      handlePointClickSelectValue(null, pointClickSelection);
    },
    [handlePointClickSelectValue]
  );

  const handleChartDblClick = useCallback(() => {
    changePivotTableWizardMode(null);
    openPanel(PanelName.Details);
  }, [openPanel, changePivotTableWizardMode]);

  const onUndo = useCallback(() => {
    undo();
  }, [undo]);

  const onScroll = useCallback(
    (
      startCol: number,
      endCol: number,
      startRow: number,
      endRow: number,
      forceRequest?: boolean
    ) => {
      if (!projectName || !sheetName || !sheetContent || !projectSheets) return;

      if (currentViewport.current) {
        const { startRow, endRow, startCol, endCol } = currentViewport.current;
        const [extStartRow, extEndRow] = getExtendedRoundedBorders(
          startRow,
          endRow
        );
        const [extStartCol, extEndCol] = getExtendedRoundedBorders(
          startCol,
          endCol
        );

        const extendedViewport = {
          startRow: extStartRow,
          endRow: extEndRow,
          startCol: extStartCol,
          endCol: extEndCol,
        };

        if (!isEqual(extendedViewport, currentExtendedViewport.current)) {
          currentExtendedViewport.current = extendedViewport;
          setData(viewGridData.toGridData(extendedViewport));
        }
      }

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
      sendChartKeyViewports({ viewportRequest });
    },
    [
      projectName,
      sheetName,
      sheetContent,
      projectSheets,
      viewGridData,
      getCurrentProjectViewport,
      sendChartKeyViewports,
    ]
  );

  useEffect(() => {
    if (!sheetName || !projectName) return;

    gridApiRef?.current?.clearSelection();
  }, [sheetName, projectName, gridApiRef]);

  const triggerOnScroll = useCallback(
    (forceRequest: boolean) => {
      let gridViewport: SelectionEdges | undefined;

      if (gridApiRef?.current) {
        gridViewport = gridApiRef.current.getViewportEdges();
      }

      if (!gridViewport) return;

      currentViewport.current = gridViewport;

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
    [gridApiRef, onScroll]
  );

  useEffect(() => {
    if (!projectName || !sheetName || !sheetContent) return;

    triggerOnScroll(!isCalculateRequested.current);

    isCalculateRequested.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
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

    const onViewportChange = debounce(() => {
      triggerOnScroll(firstViewportChange.current);

      if (firstViewportChange.current) {
        firstViewportChange.current = false;
      }
    }, 100);

    const unsubscribe = gridApi.gridViewportSubscription(onViewportChange);

    onViewportChange();

    return () => {
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridApiRef?.current, onScroll, triggerOnScroll, viewGridData]);

  useEffect(() => {
    const currentCoords = gridApiRef.current?.getViewportCoords();

    if (!currentCoords || (currentCoords.x1 === 0 && currentCoords.y1 === 0))
      return;

    gridApiRef.current?.moveViewport(-currentCoords.x1, -currentCoords.y1);
  }, [gridApiRef, sheetName]);

  useEffect(() => {
    if (!projectName) return;

    const handleDataUpdate = () => {
      if (currentViewport.current) {
        const { startRow, endRow, startCol, endCol } = currentViewport.current;
        const [extStartRow, extEndRow] = getExtendedRoundedBorders(
          startRow,
          endRow
        );
        const [extStartCol, extEndCol] = getExtendedRoundedBorders(
          startCol,
          endCol
        );

        const extendedViewport = {
          startRow: extStartRow,
          endRow: extEndRow,
          startCol: extStartCol,
          endCol: extEndCol,
        };

        currentExtendedViewport.current = extendedViewport;
        setData(viewGridData.toGridData(extendedViewport));
      }
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
    let selection: SelectionEdges | null = null;

    if (gridApiRef?.current) {
      selection = gridApiRef.current.selection$.getValue();
    }

    if (!selection || !currentViewport.current) return;
    updateSelectedCell(getSelectedCell(selection, data));
  }, [data, getSelectedCell, gridApiRef, updateSelectedCell, viewGridData]);

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
  }, [onScroll, projectName, setData, triggerOnScroll, viewGridData]);

  return (
    <div className="flex flex-col size-full relative">
      <SpreadsheetHighlight />
      <div className="grow overflow-hidden">
        <CanvasSpreadsheet
          chartData={chartData}
          charts={charts}
          columnSizes={columnSizes}
          currentSheetName={sheetName}
          data={data}
          filterList={filterList}
          formulaBarMode={formulaBarMode}
          functions={functions}
          gridApiRef={gridApiRef}
          inputFiles={inputList}
          isPointClickMode={isPointClickMode}
          isReadOnly={!isProjectEditable}
          parsedSheets={parsedSheets}
          sheetContent={sheetContent || ''}
          systemMessageContent={systemMessageContent}
          tableStructure={tableStructure}
          theme={theme}
          viewportInteractionMode={viewportInteractionMode}
          zoom={zoom}
          onAddAllFieldTotals={addAllFieldTotals}
          onAddAllTableTotals={createAllTableTotals}
          onAddChart={addChart}
          onAddField={addField}
          onAddTableRow={addTableRow}
          onAddTableRowToEnd={addTableRowToEnd}
          onApplyConditionFilter={applyConditionFilter}
          onApplyListFilter={applyListFilter}
          onApplySuggestion={applySuggestion}
          onArrangeTable={arrangeTable}
          onAutoFitFields={autoFitTableFields}
          onCellEditorChangeEditMode={onCellEditorChangeEditMode}
          onCellEditorSubmit={submitCellEditor}
          onCellEditorUpdateValue={onCellEditorUpdateValue}
          onChangeDescription={changeFieldDescription}
          onChangeFieldColumnSize={onChangeFieldColumnSize}
          onChangeFieldDimension={changeFieldDimension}
          onChangeFieldIndex={changeFieldIndex}
          onChangeFieldKey={changeFieldKey}
          onChartDblClick={handleChartDblClick}
          onChartResize={chartResize}
          onCloneTable={cloneTable}
          onConvertToChart={setChartType}
          onConvertToTable={convertToTable}
          onCreateDerivedTable={createDerivedTable}
          onCreateManualTable={createManualTable}
          onCreateTableAction={onCreateTableAction}
          onDecreaseFieldColumnSize={onDecreaseFieldColumnSize}
          onDelete={deleteSelectedFieldOrTable}
          onDeleteField={deleteField}
          onDeleteTable={deleteTable}
          onDNDTable={moveTableTo}
          onDownloadTable={downloadTable}
          onExpandDimTable={expandDimTable}
          onFlipTable={flipTable}
          onGetMoreChartKeys={getMoreChartKeys}
          onGridExpand={closeAllPanels}
          onIncreaseFieldColumnSize={onIncreaseFieldColumnSize}
          onInsertChart={createEmptyChartTable}
          onMessage={onMessage}
          onMoveTable={moveTable}
          onOpenInEditor={openInEditor}
          onOpenSheet={openSheet}
          onPaste={pasteCells}
          onPointClickSelectValue={onPointClickSelectValue}
          onPromoteRow={promoteRow}
          onRemoveFieldSizes={removeFieldSizes}
          onRemoveNote={removeNote}
          onRemoveOverride={removeOverride}
          onRemoveOverrideRow={removeTableOrOverrideRow}
          onRemoveTotalByIndex={removeTotalByIndex}
          onScroll={onScroll}
          onSelectChartKey={selectChartKey}
          onSelectionChange={onCanvasSelectionChange}
          onSelectTableForChart={selectTableForChart}
          onShowRowReference={showRowReference}
          onSortChange={changeFieldSort}
          onStartPointClick={onStartPointClick}
          onStopPointClick={onStopPointClick}
          onSwapFields={swapFieldsByDirection}
          onSwitchInput={onSwitchInput}
          onToggleTableTitleOrHeaderVisibility={
            toggleTableTitleOrHeaderVisibility
          }
          onToggleTotalByType={toggleTotalByType}
          onUndo={onUndo}
          onUpdateFieldFilterList={onUpdateFieldFilterList}
          onUpdateNote={updateNote}
        />
      </div>
      <BottomSheetBar />
    </div>
  );
}
