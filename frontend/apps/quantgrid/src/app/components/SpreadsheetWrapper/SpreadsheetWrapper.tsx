import { useContext, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import {
  CanvasSpreadsheet,
  createGridEventBus,
  SelectionEdges,
  ViewportEdges,
} from '@frontend/canvas-spreadsheet';

import { canvasId } from '../../common';
import {
  CanvasSpreadsheetContext,
  InputsContext,
  ProjectContext,
} from '../../context';
import {
  useCharts,
  useColumnSizes,
  useControlValues,
  useSelectionSystemMessage,
} from '../../hooks';
import { useFieldFilterValues } from '../../hooks/useFilterValues';
import {
  useEditorStore,
  useFormulaBarStore,
  useUserSettingsStore,
  useViewStore,
} from '../../store';
import { getSelectedCell, getSheetControls } from '../../utils';
import { BottomSheetBar } from '../BottomSheetBar';
import { SpreadsheetHighlight } from '../Project/SpreadsheetHighlight';
import { GridServices } from './types';
import { useGridDataSync } from './useGridDataSync';
import { useGridEvents } from './useGridEvents';
import { useGridServices } from './useGridServices';
import { useViewportManager } from './useViewportManager';

export function SpreadsheetWrapper() {
  const gridApiRef = useContext(CanvasSpreadsheetContext);
  const { inputList } = useContext(InputsContext);
  const {
    functions,
    projectName,
    sheetName,
    parsedSheets,
    sheetContent,
    isProjectEditable,
  } = useContext(ProjectContext);

  const formulaBarMode = useFormulaBarStore((s) => s.formulaBarMode);
  const theme = useUserSettingsStore((s) => s.data.appTheme);
  const zoom = useUserSettingsStore((s) => s.data.zoom);
  const showGridLines = useUserSettingsStore((s) => s.data.showGridLines);
  const isPointClickMode = useEditorStore((s) => s.isPointClickMode);
  const { viewportInteractionMode, updateSelectedCell } = useViewStore(
    useShallow((s) => ({
      viewportInteractionMode: s.viewportInteractionMode,
      updateSelectedCell: s.updateSelectedCell,
    })),
  );

  const currentViewport = useRef<ViewportEdges | null>(null);
  const currentExtendedViewport = useRef<ViewportEdges | null>(null);

  const {
    chartData,
    charts,
    sendChartKeyViewports,
    getMoreChartKeys,
    selectChartKey,
  } = useCharts();
  const { filterList, onUpdateFieldFilterList } = useFieldFilterValues();
  const {
    controlData,
    controlIsLoading,
    onUpdateControlValues,
    onCloseControl,
  } = useControlValues();
  const { systemMessageContent } = useSelectionSystemMessage();
  const { data, tableStructure, updateDataFromViewport } = useGridDataSync(
    currentViewport,
    currentExtendedViewport,
  );
  const { viewportRef, onScroll } = useViewportManager(
    sendChartKeyViewports,
    updateDataFromViewport,
    currentViewport,
    currentExtendedViewport,
  );

  const { columnSizes } = useColumnSizes(viewportRef);

  const sheetControls = useMemo(
    () => getSheetControls(parsedSheets ?? {}, sheetName ?? null),
    [parsedSheets, sheetName],
  );

  const services = useGridServices(
    onScroll,
    {
      getMoreChartKeys,
      selectChartKey,
    },
    {
      onUpdateFieldFilterList,
    },
    {
      onUpdateControlValues,
      onCloseControl,
    },
  );

  // Clear selection on sheet change
  useEffect(() => {
    if (!sheetName || !projectName) return;
    gridApiRef?.current?.clearSelection();
  }, [sheetName, projectName, gridApiRef]);

  // Update the selected cell
  useEffect(() => {
    let selection: SelectionEdges | null = null;

    if (gridApiRef?.current) {
      selection = gridApiRef.current.selection$.getValue();
    }

    if (!selection || !currentViewport.current) return;
    updateSelectedCell(getSelectedCell(selection, data));
  }, [data, gridApiRef, updateSelectedCell, currentViewport]);

  // Grid events handling
  const handleGridEvent = useGridEvents();
  const gridEventBus = useMemo(() => createGridEventBus(), []);
  const servicesRef = useRef<GridServices>(undefined);

  useEffect(() => {
    servicesRef.current = { ...services, data };
  }, [services, data]);

  useEffect(() => {
    const sub = gridEventBus.events$.subscribe((ev) => {
      handleGridEvent(ev, servicesRef.current);
    });

    return () => sub.unsubscribe();
  }, [gridEventBus, handleGridEvent]);

  return (
    <div className="flex flex-col size-full relative">
      <SpreadsheetHighlight />
      <div className="grow overflow-hidden">
        <CanvasSpreadsheet
          canvasId={canvasId}
          chartData={chartData}
          charts={charts}
          columnSizes={columnSizes}
          controlData={controlData}
          controlIsLoading={controlIsLoading}
          currentSheetName={sheetName}
          data={data}
          eventBus={gridEventBus}
          filterList={filterList}
          formulaBarMode={formulaBarMode}
          functions={functions}
          gridApiRef={gridApiRef}
          inputFiles={inputList}
          isPointClickMode={isPointClickMode}
          isReadOnly={!isProjectEditable}
          parsedSheets={parsedSheets}
          sheetContent={sheetContent || ''}
          sheetControls={sheetControls}
          showGridLines={showGridLines}
          systemMessageContent={systemMessageContent}
          tableStructure={tableStructure}
          theme={theme}
          viewportInteractionMode={viewportInteractionMode}
          zoom={zoom}
        />
      </div>
      <BottomSheetBar />
    </div>
  );
}
