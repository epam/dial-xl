import {
  Application as PixiApplication,
  BitmapText,
  Container,
  Graphics,
  Sprite,
} from 'pixi.js';
import { RefObject, useEffect, useMemo, useRef, useState } from 'react';

import { isFeatureFlagEnabled } from '@frontend/common';
import { initDevtools } from '@pixi/devtools';
import { Application, extend } from '@pixi/react';

import {
  AIPrompt,
  CellEditor,
  CellEditorContextProvider,
  Charts,
  ContextMenu,
  Control,
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
import { initBitmapFonts, loadFonts, loadIcons, stageOptions } from './setup';
import { GridApi, GridProps } from './types';

// Extend PixiJS components for use in @pixi/react
extend({ Container, Graphics, Sprite, BitmapText });

const fontLoading = loadFonts();
const iconsLoading = loadIcons();

export const CanvasSpreadsheet = (
  props: GridProps & { gridApiRef: RefObject<GridApi | null> },
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
    isReadOnly,
    eventBus,
    controlData,
    controlIsLoading,
    showGridLines,
  } = props;

  const [app, setApp] = useState<PixiApplication | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [bitmapFontsLoaded, setBitmapFontsLoaded] = useState(false);
  const [iconsLoaded, setIconsLoaded] = useState(false);
  const [isGridApiInitialized, setIsGridApiInitialized] = useState(false);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);

  const { gridWidth, gridHeight } = useGridResize({ gridContainerRef, app });

  const scaledColumnSizes = useMemo(() => {
    return Object.fromEntries(
      Object.entries(columnSizes).map(([key, value]) => [key, value * zoom]),
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
    iconsLoading.then(() => {
      setIconsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;

    setBitmapFontsLoaded(false);
    initBitmapFonts(zoom);
    setBitmapFontsLoaded(true);
  }, [zoom, themeName, fontsLoaded]);

  // Cleanup gridApiRef on unmount.
  // Reason: entire canvas will be empty after unmounting (e.g., switch to mobile view and back, hmr, etc.),
  useEffect(() => {
    return () => {
      gridApiRef.current = null;
    };
  }, [gridApiRef]);

  return (
    <div
      className="h-full w-full relative overflow-hidden select-none bg-bg-layer-1"
      id={canvasId}
      ref={gridContainerRef}
    >
      {fontsLoaded && bitmapFontsLoaded && iconsLoaded && (
        <>
          <Application
            height={gridHeight}
            width={gridWidth}
            onInit={setApp}
            {...stageOptions}
          >
            <GridStateContextProvider
              apiRef={gridApiRef}
              app={app}
              columnSizes={scaledColumnSizes}
              data={data}
              eventBus={eventBus}
              gridContainerRef={gridContainerRef}
              pointClickMode={isPointClickMode}
              showGridLines={showGridLines}
              tableStructure={tableStructure}
              themeName={themeName}
              viewportInteractionMode={viewportInteractionMode}
              zoom={zoom}
            >
              <GridViewportContextProvider>
                <GridApiWrapper
                  gridApiRef={gridApiRef}
                  onGridApiInitialized={() => setIsGridApiInitialized(true)}
                />
                {isGridApiInitialized && <GridComponents />}
              </GridViewportContextProvider>
            </GridStateContextProvider>
          </Application>

          {/* Component depends on grid api */}
          {isGridApiInitialized && (
            <>
              <ContextMenu
                apiRef={gridApiRef}
                app={app}
                eventBus={eventBus}
                filterList={filterList}
                functions={functions}
                inputFiles={inputFiles}
                parsedSheets={parsedSheets}
              />
              <CellEditorContextProvider
                apiRef={gridApiRef}
                eventBus={eventBus}
                formulaBarMode={formulaBarMode}
                isReadOnly={isReadOnly}
                zoom={zoom}
              >
                <CellEditor
                  apiRef={gridApiRef}
                  app={app}
                  eventBus={eventBus}
                  formulaBarMode={formulaBarMode}
                  functions={functions}
                  inputList={inputFiles}
                  isPointClickMode={isPointClickMode}
                  parsedSheets={parsedSheets}
                  sheetContent={sheetContent}
                  theme={themeName}
                  zoom={zoom}
                />
              </CellEditorContextProvider>
              {isShowAIPrompt && (
                <AIPrompt
                  apiRef={gridApiRef}
                  currentSheetName={currentSheetName}
                  eventBus={eventBus}
                  systemMessageContent={systemMessageContent}
                  zoom={zoom}
                />
              )}
              <Tooltip apiRef={gridApiRef} />
              <Notes apiRef={gridApiRef} eventBus={eventBus} zoom={zoom} />
              <Charts
                apiRef={gridApiRef}
                chartData={chartData}
                charts={charts}
                columnSizes={scaledColumnSizes}
                eventBus={eventBus}
                tableStructure={tableStructure}
                theme={themeName}
                zoom={zoom}
              />
              <Control
                apiRef={gridApiRef}
                controlData={controlData}
                controlIsLoading={controlIsLoading}
                eventBus={eventBus}
                zoom={zoom}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};
