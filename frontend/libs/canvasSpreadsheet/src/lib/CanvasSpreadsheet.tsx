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
import {
  initBitmapFonts,
  loadFonts,
  loadIcons,
  setupPixi,
  stageOptions,
} from './setup';
import { GridApi, GridProps } from './types';

setupPixi();
const fontLoading = loadFonts();
const iconsLoading = loadIcons();

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
    isReadOnly,
    eventBus,
    controlData,
    controlIsLoading,
  } = props;

  const [app, setApp] = useState<Application | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [bitmapFontsLoaded, setBitmapFontsLoaded] = useState(false);
  const [iconsLoaded, setIconsLoaded] = useState(false);
  const [isGridApiInitialized, setIsGridApiInitialized] = useState(false);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);

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
    app.stop();
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
    initBitmapFonts(zoom, themeName);
    setBitmapFontsLoaded(true);
  }, [zoom, themeName, fontsLoaded]);

  return (
    <div
      className="h-full w-full relative overflow-hidden select-none"
      id={canvasId}
      ref={gridContainerRef}
    >
      {fontsLoaded && bitmapFontsLoaded && iconsLoaded && (
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
              eventBus={eventBus}
              gridContainerRef={gridContainerRef}
              pointClickMode={isPointClickMode}
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
          </Stage>

          {/* Component depends on grid api */}
          {isGridApiInitialized && (
            <>
              <ContextMenu
                apiRef={gridApiRef as RefObject<GridApi>}
                app={app}
                eventBus={eventBus}
                filterList={filterList}
                functions={functions}
                inputFiles={inputFiles}
                parsedSheets={parsedSheets}
              />
              <CellEditorContextProvider
                apiRef={gridApiRef as RefObject<GridApi>}
                eventBus={eventBus}
                formulaBarMode={formulaBarMode}
                isReadOnly={isReadOnly}
                zoom={zoom}
              >
                <CellEditor
                  apiRef={gridApiRef as RefObject<GridApi>}
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
                  api={(gridApiRef as RefObject<GridApi>).current}
                  currentSheetName={currentSheetName}
                  eventBus={eventBus}
                  systemMessageContent={systemMessageContent}
                  zoom={zoom}
                />
              )}
              <Tooltip apiRef={gridApiRef as RefObject<GridApi>} />
              <Notes
                api={(gridApiRef as RefObject<GridApi>).current}
                eventBus={eventBus}
                zoom={zoom}
              />
              <Charts
                api={(gridApiRef as RefObject<GridApi>).current}
                chartData={chartData}
                charts={charts}
                columnSizes={scaledColumnSizes}
                eventBus={eventBus}
                tableStructure={tableStructure}
                theme={themeName}
                zoom={zoom}
              />
              <Control
                api={(gridApiRef as RefObject<GridApi>).current}
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
