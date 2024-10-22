import {
  forwardRef,
  RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Application } from '@pixi/app';
import { initDevtools } from '@pixi/devtools';
import { Stage } from '@pixi/react';

import styles from './CanvasSpreadsheet.module.scss';
import {
  AIPrompt,
  CellEditor,
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

export const CanvasSpreadsheet = forwardRef<GridApi, GridProps>(
  (props, gridApiRef) => {
    const {
      zoom = 1,
      data,
      theme: themeName,
      charts,
      chartData,
      formulaBarMode,
      functions,
      parsedSheets,
      sheetContent,
      systemMessageContent,
      tableStructure,
      inputFiles,
      isPointClickMode,
      columnSizes,
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
      gridCallbacksRef.current.onChangeFieldColumnSize =
        onChangeFieldColumnSize;
      gridCallbacksRef.current.onRemoveDimension = onRemoveDimension;
      gridCallbacksRef.current.onAddKey = onAddKey;
      gridCallbacksRef.current.onRemoveKey = onRemoveKey;
      gridCallbacksRef.current.onAddDimension = onAddDimension;
      gridCallbacksRef.current.onCreateDerivedTable = onCreateDerivedTable;
      gridCallbacksRef.current.onCellEditorSubmit = onCellEditorSubmit;
      gridCallbacksRef.current.onRemoveOverride = onRemoveOverride;
      gridCallbacksRef.current.onAddOverride = onAddOverride;
      gridCallbacksRef.current.onAddTableRow = onAddTableRow;
      gridCallbacksRef.current.onApplySuggestion = onApplySuggestion;
      gridCallbacksRef.current.onEditOverride = onEditOverride;
      gridCallbacksRef.current.onCellEditorUpdateValue =
        onCellEditorUpdateValue;
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
      gridCallbacksRef.current.onPointClickSelectValue =
        onPointClickSelectValue;
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
      gridCallbacksRef.current.onUndo = onUndo;
      gridCallbacksRef.current.onAIPendingChanges = onAIPendingChanges;
      gridCallbacksRef.current.onAIPendingBanner = onAIPendingBanner;
      gridCallbacksRef.current.onOpenSheet = onOpenSheet;
      gridCallbacksRef.current.onArrangeTable = onArrangeTable;
    }, [
      onArrangeTable,
      onAIPendingChanges,
      onSelectionChange,
      onCreateManualTable,
      onCreateTableAction,
      onScroll,
      onRenameTable,
      onRenameField,
      onEditExpression,
      onEditExpressionWithOverrideRemove,
      onMoveTable,
      onDeleteField,
      onDeleteTable,
      onSwapFields,
      onIncreaseFieldColumnSize,
      onDecreaseFieldColumnSize,
      onChangeFieldColumnSize,
      onRemoveDimension,
      onAddKey,
      onRemoveKey,
      onAddDimension,
      onCreateDerivedTable,
      onCellEditorSubmit,
      onRemoveOverride,
      onAddOverride,
      onAddTableRow,
      onEditOverride,
      onCellEditorUpdateValue,
      onCellEditorMessage,
      onDNDTable,
      onExpandDimTable,
      onCloseTable,
      onChartResize,
      onGetMoreChartKeys,
      onSelectChartKey,
      onAddChart,
      onConvertToChart,
      onConvertToTable,
      onPaste,
      onAddField,
      onRemoveNote,
      onUpdateNote,
      onStartPointClick,
      onStopPointClick,
      onPointClickSelectValue,
      onOpenInEditor,
      onDelete,
      onToggleTableHeaderVisibility,
      onToggleTableFieldsVisibility,
      onSortChange,
      onApplyNumericFilter,
      onFlipTable,
      onApplyListFilter,
      onCellEditorChangeEditMode,
      onRemoveTotalByType,
      onRemoveTotalByIndex,
      onToggleTotalByType,
      onAddTotalExpression,
      onEditTotalExpression,
      onGetFieldFilterList,
      onCloneTable,
      onPromoteRow,
      onShowRowReference,
      onAddTableRowToEnd,
      onRemoveOverrideRow,
      onApplySuggestion,
      onUndo,
      onOpenSheet,
      onAIPendingBanner,
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
                zoom={zoom}
              >
                <GridViewportContextProvider>
                  <GridApiWrapper ref={gridApiRef} />
                  <GridComponents />
                </GridViewportContextProvider>
              </GridStateContextProvider>
            </Stage>
            <ContextMenu
              apiRef={gridApiRef as RefObject<GridApi>}
              app={app}
              functions={functions}
              gridCallbacksRef={gridCallbacksRef}
              inputFiles={inputFiles}
              parsedSheets={parsedSheets}
            />
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
            <AIPrompt
              api={(gridApiRef as RefObject<GridApi>).current}
              currentSheetName={currentSheetName}
              gridCallbacksRef={gridCallbacksRef}
              systemMessageContent={systemMessageContent}
              zoom={zoom}
            />
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
              theme={themeName}
              zoom={zoom}
            />
          </>
        )}
      </div>
    );
  }
);
