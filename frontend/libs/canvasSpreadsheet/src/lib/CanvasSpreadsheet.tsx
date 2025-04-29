import {
  MutableRefObject,
  RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { isFeatureFlagEnabled } from '@frontend/common';
import { Application } from '@pixi/app';
import { initDevtools } from '@pixi/devtools';
import { Stage } from '@pixi/react';

import styles from './CanvasSpreadsheet.module.scss';
import {
  AIPrompt,
  CellEditor,
  CellEditorContextProvider,
  Charts,
  ContextMenu,
  GridApiWrapper,
  GridComponents,
  Notes,
  Tooltip,
} from './components';
import { canvasId } from './constants';
import {
  GridStateContextProvider,
  GridViewportContextProvider,
} from './context';
import { useGridResize } from './hooks';
import { initBitmapFonts, loadFonts, setupPixi, stageOptions } from './setup';
import { GridApi, GridCallbacks, GridProps } from './types';

setupPixi();
const fontLoading = loadFonts();

export const CanvasSpreadsheet = (
  props: GridProps & { gridApiRef: MutableRefObject<GridApi | null> }
) => {
  const {
    gridApiRef,
    zoom = 1,
    data,
    theme: themeName,
    charts,
    chartData,
    formulaBarMode,
    filterList,
    functions,
    parsedSheets,
    sheetContent,
    systemMessageContent,
    tableStructure,
    inputFiles,
    isPointClickMode,
    columnSizes,
    currentSheetName,
    viewportInteractionMode,
    onAIPendingBanner,
    onAIPendingChanges,
    onAddAllFieldTotals,
    onAddAllTableTotals,
    onAddChart,
    onAddField,
    onAddTableRow,
    onAddTableRowToEnd,
    onApplyConditionFilter,
    onApplyListFilter,
    onApplySuggestion,
    onArrangeTable,
    onCellEditorChangeEditMode,
    onCellEditorSubmit,
    onCellEditorUpdateValue,
    onChangeFieldColumnSize,
    onChangeFieldDimension,
    onChangeFieldKey,
    onChangeFieldIndex,
    onChangeDescription,
    onChartDblClick,
    onChartResize,
    onCloneTable,
    onConvertToChart,
    onConvertToTable,
    onCreateDerivedTable,
    onCreateManualTable,
    onCreateTableAction,
    onDNDTable,
    onDecreaseFieldColumnSize,
    onDelete,
    onDeleteField,
    onDeleteTable,
    onExpandDimTable,
    onFlipTable,
    onGetMoreChartKeys,
    onIncreaseFieldColumnSize,
    onInsertChart,
    onMessage,
    onMoveTable,
    onMoveTableToSheet,
    onOpenInEditor,
    onOpenSheet,
    onPaste,
    onPointClickSelectValue,
    onPromoteRow,
    onRemoveNote,
    onRemoveOverride,
    onRemoveOverrideRow,
    onRemoveTotalByIndex,
    onScroll,
    onSelectChartKey,
    onSelectTableForChart,
    onSelectionChange,
    onShowRowReference,
    onSortChange,
    onStartPointClick,
    onStopPointClick,
    onSwapFields,
    onToggleTableTitleOrHeaderVisibility,
    onToggleTotalByType,
    onUndo,
    onUpdateFieldFilterList,
    onUpdateNote,
    onAutoFitFields,
    onRemoveFieldSizes,
    onDownloadTable,
  } = props;

  const [app, setApp] = useState<Application | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [bitmapFontsLoaded, setBitmapFontsLoaded] = useState(false);

  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const gridCallbacksRef = useRef<GridCallbacks>({});

  const { gridWidth, gridHeight } = useGridResize({ gridContainerRef, app });

  const scaledColumnSizes = useMemo(() => {
    return Object.fromEntries(
      Object.entries(columnSizes).map(([key, value]) => [key, value * zoom])
    );
  }, [columnSizes, zoom]);

  const isShowAIPrompt = isFeatureFlagEnabled('askAI');

  useEffect(() => {
    if (!app || window.location.protocol !== 'http:') return;

    initDevtools({ app });
  }, [app]);

  useEffect(() => {
    fontLoading.then(() => {
      setFontsLoaded(true);
    });
  }, []);

  useEffect(() => {
    setBitmapFontsLoaded(false);
    initBitmapFonts(zoom, themeName);
    setBitmapFontsLoaded(true);
  }, [zoom, themeName]);

  useEffect(() => {
    gridCallbacksRef.current.onScroll = onScroll;
    gridCallbacksRef.current.onSelectionChange = onSelectionChange;
    gridCallbacksRef.current.onMoveTable = onMoveTable;
    gridCallbacksRef.current.onDeleteField = onDeleteField;
    gridCallbacksRef.current.onDeleteTable = onDeleteTable;
    gridCallbacksRef.current.onSwapFields = onSwapFields;
    gridCallbacksRef.current.onIncreaseFieldColumnSize =
      onIncreaseFieldColumnSize;
    gridCallbacksRef.current.onDecreaseFieldColumnSize =
      onDecreaseFieldColumnSize;
    gridCallbacksRef.current.onChangeFieldColumnSize = onChangeFieldColumnSize;
    gridCallbacksRef.current.onChangeFieldDimension = onChangeFieldDimension;
    gridCallbacksRef.current.onChangeFieldKey = onChangeFieldKey;
    gridCallbacksRef.current.onCreateDerivedTable = onCreateDerivedTable;
    gridCallbacksRef.current.onCellEditorSubmit = onCellEditorSubmit;
    gridCallbacksRef.current.onRemoveOverride = onRemoveOverride;
    gridCallbacksRef.current.onAddTableRow = onAddTableRow;
    gridCallbacksRef.current.onApplySuggestion = onApplySuggestion;
    gridCallbacksRef.current.onCellEditorUpdateValue = onCellEditorUpdateValue;
    gridCallbacksRef.current.onMessage = onMessage;
    gridCallbacksRef.current.onDNDTable = onDNDTable;
    gridCallbacksRef.current.onExpandDimTable = onExpandDimTable;
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
    gridCallbacksRef.current.onToggleTableTitleOrHeaderVisibility =
      onToggleTableTitleOrHeaderVisibility;
    gridCallbacksRef.current.onSortChange = onSortChange;
    gridCallbacksRef.current.onApplyConditionFilter = onApplyConditionFilter;
    gridCallbacksRef.current.onFlipTable = onFlipTable;
    gridCallbacksRef.current.onApplyListFilter = onApplyListFilter;
    gridCallbacksRef.current.onCellEditorChangeEditMode =
      onCellEditorChangeEditMode;
    gridCallbacksRef.current.onRemoveTotalByIndex = onRemoveTotalByIndex;
    gridCallbacksRef.current.onToggleTotalByType = onToggleTotalByType;
    gridCallbacksRef.current.onUpdateFieldFilterList = onUpdateFieldFilterList;
    gridCallbacksRef.current.onCloneTable = onCloneTable;
    gridCallbacksRef.current.onPromoteRow = onPromoteRow;
    gridCallbacksRef.current.onShowRowReference = onShowRowReference;
    gridCallbacksRef.current.onCreateTableAction = onCreateTableAction;
    gridCallbacksRef.current.onCreateManualTable = onCreateManualTable;
    gridCallbacksRef.current.onAddTableRowToEnd = onAddTableRowToEnd;
    gridCallbacksRef.current.onRemoveOverrideRow = onRemoveOverrideRow;
    gridCallbacksRef.current.onUndo = onUndo;
    gridCallbacksRef.current.onAIPendingChanges = onAIPendingChanges;
    gridCallbacksRef.current.onAIPendingBanner = onAIPendingBanner;
    gridCallbacksRef.current.onOpenSheet = onOpenSheet;
    gridCallbacksRef.current.onArrangeTable = onArrangeTable;
    gridCallbacksRef.current.onAddAllFieldTotals = onAddAllFieldTotals;
    gridCallbacksRef.current.onAddAllTableTotals = onAddAllTableTotals;
    gridCallbacksRef.current.onInsertChart = onInsertChart;
    gridCallbacksRef.current.onSelectTableForChart = onSelectTableForChart;
    gridCallbacksRef.current.onChartDblClick = onChartDblClick;
    gridCallbacksRef.current.onMoveTableToSheet = onMoveTableToSheet;
    gridCallbacksRef.current.onAutoFitFields = onAutoFitFields;
    gridCallbacksRef.current.onRemoveFieldSizes = onRemoveFieldSizes;
    gridCallbacksRef.current.onChangeFieldIndex = onChangeFieldIndex;
    gridCallbacksRef.current.onChangeDescription = onChangeDescription;
    gridCallbacksRef.current.onDownloadTable = onDownloadTable;
  }, [
    onAIPendingBanner,
    onAIPendingChanges,
    onAddAllFieldTotals,
    onAddAllTableTotals,
    onAddChart,
    onAddField,
    onAddTableRow,
    onAddTableRowToEnd,
    onApplyConditionFilter,
    onApplyListFilter,
    onApplySuggestion,
    onArrangeTable,
    onCellEditorChangeEditMode,
    onCellEditorSubmit,
    onCellEditorUpdateValue,
    onChangeFieldColumnSize,
    onChangeFieldDimension,
    onChangeDescription,
    onChangeFieldKey,
    onChangeFieldIndex,
    onChartDblClick,
    onChartResize,
    onCloneTable,
    onConvertToChart,
    onConvertToTable,
    onCreateDerivedTable,
    onCreateManualTable,
    onCreateTableAction,
    onDNDTable,
    onDecreaseFieldColumnSize,
    onDelete,
    onDeleteField,
    onDeleteTable,
    onExpandDimTable,
    onFlipTable,
    onGetMoreChartKeys,
    onIncreaseFieldColumnSize,
    onInsertChart,
    onMessage,
    onMoveTable,
    onMoveTableToSheet,
    onOpenInEditor,
    onOpenSheet,
    onPaste,
    onPointClickSelectValue,
    onPromoteRow,
    onRemoveNote,
    onRemoveOverride,
    onRemoveOverrideRow,
    onRemoveTotalByIndex,
    onScroll,
    onSelectChartKey,
    onSelectTableForChart,
    onSelectionChange,
    onShowRowReference,
    onSortChange,
    onStartPointClick,
    onStopPointClick,
    onSwapFields,
    onToggleTableTitleOrHeaderVisibility,
    onToggleTotalByType,
    onUndo,
    onUpdateFieldFilterList,
    onUpdateNote,
    onAutoFitFields,
    onRemoveFieldSizes,
    onDownloadTable,
  ]);

  return (
    <div
      className={styles.canvasSpreadsheet}
      id={canvasId}
      ref={gridContainerRef}
    >
      {fontsLoaded && bitmapFontsLoaded && (
        <>
          <Stage
            height={gridHeight}
            options={stageOptions}
            width={gridWidth}
            onMount={setApp}
          >
            <GridStateContextProvider
              apiRef={gridApiRef as RefObject<GridApi>}
              app={app}
              columnSizes={scaledColumnSizes}
              data={data}
              gridCallbacksRef={gridCallbacksRef}
              gridContainerRef={gridContainerRef}
              pointClickMode={isPointClickMode}
              tableStructure={tableStructure}
              themeName={themeName}
              viewportInteractionMode={viewportInteractionMode}
              zoom={zoom}
            >
              <GridViewportContextProvider>
                <GridApiWrapper gridApiRef={gridApiRef} />
                <GridComponents />
              </GridViewportContextProvider>
            </GridStateContextProvider>
          </Stage>
          <ContextMenu
            apiRef={gridApiRef as RefObject<GridApi>}
            app={app}
            filterList={filterList}
            functions={functions}
            gridCallbacksRef={gridCallbacksRef}
            inputFiles={inputFiles}
            parsedSheets={parsedSheets}
          />
          <CellEditorContextProvider
            apiRef={gridApiRef as RefObject<GridApi>}
            formulaBarMode={formulaBarMode}
            gridCallbacksRef={gridCallbacksRef}
            zoom={zoom}
          >
            <CellEditor
              apiRef={gridApiRef as RefObject<GridApi>}
              app={app}
              formulaBarMode={formulaBarMode}
              functions={functions}
              gridCallbacksRef={gridCallbacksRef}
              isPointClickMode={isPointClickMode}
              parsedSheets={parsedSheets}
              sheetContent={sheetContent}
              theme={themeName}
              zoom={zoom}
            />
          </CellEditorContextProvider>
          {isShowAIPrompt && (
            <AIPrompt
              api={(gridApiRef as RefObject<GridApi>).current}
              currentSheetName={currentSheetName}
              gridCallbacksRef={gridCallbacksRef}
              systemMessageContent={systemMessageContent}
              zoom={zoom}
            />
          )}
          <Tooltip apiRef={gridApiRef as RefObject<GridApi>} />
          <Notes
            api={(gridApiRef as RefObject<GridApi>).current}
            gridCallbacksRef={gridCallbacksRef}
            zoom={zoom}
          />
          <Charts
            api={(gridApiRef as RefObject<GridApi>).current}
            chartData={chartData}
            charts={charts}
            columnSizes={scaledColumnSizes}
            gridCallbacksRef={gridCallbacksRef}
            parsedSheets={parsedSheets}
            tableStructure={tableStructure}
            theme={themeName}
            zoom={zoom}
          />
        </>
      )}
    </div>
  );
};
