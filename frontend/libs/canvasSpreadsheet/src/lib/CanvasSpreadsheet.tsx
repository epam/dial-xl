import {
  Application as PixiApplication,
  BitmapText,
  Container,
  Graphics,
  Sprite,
} from 'pixi.js';
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { isFeatureFlagEnabled } from '@frontend/common';
import { initDevtools } from '@pixi/devtools';
import { Application, extend } from '@pixi/react';

import { CanvasErrorBoundary } from './CanvasErrorBoundary';
import {
  AIPrompt,
  CellEditor,
  CellEditorContextProvider,
  Charts,
  ContextMenu,
  Control,
  ErrorMessage,
  GridApiWrapper,
  GridComponents,
  Notes,
  Tooltip,
} from './components';
import {
  GridStateContextProvider,
  GridViewportContextProvider,
} from './context';
import { useGridResize } from './hooks';
import { initBitmapFonts, loadFonts, loadIcons, stageOptions } from './setup';
import { CanvasOptions, GridApi, GridProps } from './types';

// Extend PixiJS components for use in @pixi/react
extend({ Container, Graphics, Sprite, BitmapText });

const fontLoading = loadFonts();
const iconsLoading = loadIcons();

const defaultCanvasOptions: CanvasOptions = {
  enableMoveTable: true,
  enableOverflowComponents: true,
  placement: 'body',
  showDNDSelection: true,
  showDottedSelection: true,
  showErrors: true,
  showExpandButton: true,
  showHiddenCells: true,
  showNotes: true,
  showOverrides: true,
  showResizers: true,
  showSelection: true,
  showTableBorders: true,
  showWelcomeMessage: true,
  colNumberType: 'number',
};

export const CanvasSpreadsheet = (
  props: GridProps & { gridApiRef: RefObject<GridApi | null> },
) => {
  const {
    canvasId,
    canvasOptions = defaultCanvasOptions,
    chartData = {},
    charts,
    columnSizes = {},
    controlData = null,
    controlIsLoading = false,
    currentSheetName = null,
    data,
    eventBus,
    filterList = [],
    formulaBarMode = 'formula',
    functions = [],
    gridApiRef,
    inputFiles = null,
    isPointClickMode = false,
    isReadOnly = false,
    parsedSheets = {},
    sheetContent = '',
    sheetControls = [],
    showGridLines = true,
    systemMessageContent,
    tableStructure,
    theme: themeName,
    viewportInteractionMode = 'select',
    zoom = 1,
  } = props;

  const [app, setApp] = useState<PixiApplication | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [bitmapFontsLoaded, setBitmapFontsLoaded] = useState(false);
  const [iconsLoaded, setIconsLoaded] = useState(false);
  const [isGridApiInitialized, setIsGridApiInitialized] = useState(false);
  const [canvasError, setCanvasError] = useState<boolean>(false);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);

  const { gridWidth, gridHeight } = useGridResize({ gridContainerRef, app });

  const scaledColumnSizes = useMemo(() => {
    return Object.fromEntries(
      Object.entries(columnSizes).map(([key, value]) => [
        key,
        Math.round(value * zoom),
      ]),
    );
  }, [columnSizes, zoom]);

  const isShowAIPrompt = isFeatureFlagEnabled('askAI');

  const initApp = useCallback((newApp: PixiApplication) => {
    setApp(newApp);

    if (window.location.protocol === 'http:') {
      initDevtools({ app: newApp });
    }
  }, []);

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
    setIsGridApiInitialized(false);

    return () => {
      gridApiRef.current = null;
    };
  }, [gridApiRef]);

  // Catch WebGL context lost errors
  // Note: there are 2 Error Boundaries in this component.
  // The first one is for catching React errors.
  // The second one is for catching errors in PixiJS components.
  useEffect(() => {
    if (!isGridApiInitialized || !app?.renderer) return;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setCanvasError(true);
    };

    app?.canvas?.addEventListener?.('webglcontextlost', handleContextLost);

    return () => {
      app?.canvas?.removeEventListener?.('webglcontextlost', handleContextLost);
    };
  }, [app, canvasId, isGridApiInitialized]);

  // Catch global errors and unhandled promise rejections
  // Show only console warnings for now to avoid interfering with the user experience and e2e tests.
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      // eslint-disable-next-line no-console
      console.warn(e);
    };

    const onUnhandledRejection = (e: PromiseRejectionEvent) => {
      // eslint-disable-next-line no-console
      console.warn(e);
    };

    window.addEventListener('error', onError, { capture: true });
    window.addEventListener('unhandledrejection', onUnhandledRejection, {
      capture: true,
    });

    return () => {
      window.removeEventListener('error', onError, { capture: true });
      window.removeEventListener('unhandledrejection', onUnhandledRejection, {
        capture: true,
      });
    };
  }, []);

  return (
    <div
      className="h-full w-full relative overflow-hidden select-none bg-bg-layer-1"
      id={canvasId}
      ref={gridContainerRef}
    >
      {!canvasError && fontsLoaded && bitmapFontsLoaded && iconsLoaded && (
        <CanvasErrorBoundary onError={() => setCanvasError(true)}>
          <GridStateContextProvider
            apiRef={gridApiRef}
            app={app}
            canvasId={canvasId}
            canvasOptions={canvasOptions}
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
                isGridApiInitialized={isGridApiInitialized}
                onGridApiInitialized={() => setIsGridApiInitialized(true)}
              >
                {isGridApiInitialized && (
                  <Application
                    height={gridHeight}
                    width={gridWidth}
                    onInit={initApp}
                    {...stageOptions}
                  >
                    <CanvasErrorBoundary onError={() => setCanvasError(true)}>
                      <GridComponents />
                    </CanvasErrorBoundary>
                  </Application>
                )}

                {/* Component depends on grid api */}
                {isGridApiInitialized &&
                  canvasOptions.enableOverflowComponents && (
                    <>
                      <ContextMenu
                        app={app}
                        eventBus={eventBus}
                        filterList={filterList}
                        functions={functions}
                        inputFiles={inputFiles}
                        parsedSheets={parsedSheets}
                        sheetControls={sheetControls}
                      />
                      <CellEditorContextProvider
                        eventBus={eventBus}
                        formulaBarMode={formulaBarMode}
                        isReadOnly={isReadOnly}
                      >
                        <CellEditor
                          app={app}
                          eventBus={eventBus}
                          formulaBarMode={formulaBarMode}
                          functions={functions}
                          inputList={inputFiles}
                          isPointClickMode={isPointClickMode}
                          parsedSheets={parsedSheets}
                          sheetContent={sheetContent}
                          theme={themeName}
                        />
                      </CellEditorContextProvider>
                      {isShowAIPrompt && (
                        <AIPrompt
                          currentSheetName={currentSheetName}
                          eventBus={eventBus}
                          systemMessageContent={systemMessageContent}
                        />
                      )}
                      <Tooltip />
                      <Notes eventBus={eventBus} />
                      <Charts
                        chartData={chartData}
                        charts={charts}
                        eventBus={eventBus}
                        tableStructure={tableStructure}
                        theme={themeName}
                      />
                      <Control
                        controlData={controlData}
                        controlIsLoading={controlIsLoading}
                        eventBus={eventBus}
                      />
                    </>
                  )}
              </GridApiWrapper>
            </GridViewportContextProvider>
          </GridStateContextProvider>
        </CanvasErrorBoundary>
      )}

      {canvasError && <ErrorMessage />}
    </div>
  );
};
