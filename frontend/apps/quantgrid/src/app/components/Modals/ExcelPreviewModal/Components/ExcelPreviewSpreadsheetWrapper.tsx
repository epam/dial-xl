import { Spin } from 'antd';
import { useContext, useEffect, useMemo, useRef } from 'react';

import {
  CanvasOptions,
  CanvasSpreadsheet,
  createGridEventBus,
  GridBusEvent,
  SelectionEdges,
  ViewportEdges,
} from '@frontend/canvas-spreadsheet';

import { useUserSettingsStore } from '../../../../store';
import { ExcelPreviewCanvasContext } from '../ExcelPreviewCanvasContext';
import { ExcelPreviewViewportContext } from '../ExcelPreviewViewportContext';
import {
  useExcelPreviewGridDataSync,
  useExcelPreviewViewportManager,
} from '../hooks';
import { ExcelTarget } from '../utils';

const canvasDefaultOptions: CanvasOptions = {
  enableMoveTable: false,
  enableOverflowComponents: false,
  placement: 'modal',
  showDNDSelection: false,
  showDottedSelection: false,
  showErrors: false,
  showExpandButton: false,
  showHiddenCells: false,
  showNotes: false,
  showOverrides: false,
  showResizers: false,
  showSelection: true,
  showTableBorders: false,
  showWelcomeMessage: false,
  colNumberType: 'excel',
};

export type Props = {
  path: string | null;
  target: ExcelTarget;
  onSelectionChanged?: (selection: SelectionEdges | null) => void;
};

export function ExcelPreviewSpreadsheetWrapper({
  path,
  target,
  onSelectionChanged,
}: Props) {
  const { viewGridData } = useContext(ExcelPreviewViewportContext);
  const gridApiRef = useContext(ExcelPreviewCanvasContext);

  const zoom = useUserSettingsStore((s) => s.data.zoom);
  const theme = useUserSettingsStore((s) => s.data.appTheme);
  const gridEventBus = useMemo(() => createGridEventBus(), []);

  const currentViewport = useRef<ViewportEdges | null>(null);
  const currentExtendedViewport = useRef<ViewportEdges | null>(null);

  const { data, updateDataFromViewport } = useExcelPreviewGridDataSync(
    currentViewport,
    currentExtendedViewport,
  );
  const { onScroll, loading } = useExcelPreviewViewportManager(
    updateDataFromViewport,
    currentViewport,
    currentExtendedViewport,
    path,
  );

  useEffect(() => {
    const sub = gridEventBus.events$.subscribe((ev: GridBusEvent) => {
      if (ev.type === 'viewport/scrolled') {
        onScroll(ev.payload);
      }

      if (ev.type === 'selection/changed') {
        onSelectionChanged?.(ev.payload || null);
      }
    });

    return () => sub.unsubscribe();
  }, [gridEventBus, onScroll, onSelectionChanged]);

  // Clear grid cache and data whenever we switch the target.
  useEffect(() => {
    viewGridData.clear();
    onSelectionChanged?.(null);

    const api = gridApiRef.current;
    api?.clearSelection?.();
  }, [gridApiRef, onSelectionChanged, target, viewGridData]);

  const canvasOptions = useMemo(() => {
    if (target?.kind === 'table') {
      return {
        ...canvasDefaultOptions,
        showSelection: false,
        colNumberType: 'number',
      } as CanvasOptions;
    }

    return canvasDefaultOptions;
  }, [target?.kind]);

  return (
    <>
      {loading && (
        <div className="absolute top-3 left-3 z-30 pointer-events-none">
          <div className="flex items-center gap-2 rounded-md bg-white/80 px-2 py-1 shadow">
            <Spin size="default" />
            <span className="text-[14px] text-text-primary">
              Loading data...
            </span>
          </div>
        </div>
      )}
      <CanvasSpreadsheet
        canvasId="excel-preview-canvas"
        canvasOptions={canvasOptions}
        data={data}
        eventBus={gridEventBus}
        gridApiRef={gridApiRef}
        tableStructure={[]}
        theme={theme}
        zoom={zoom}
      />
    </>
  );
}
