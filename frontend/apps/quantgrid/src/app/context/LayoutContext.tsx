import {
  createContext,
  PropsWithChildren,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { ReflexContainer, ReflexElement, ReflexSplitter } from 'react-reflex';

import { PanelInfo, PanelName, PanelPosition, PanelRecord } from '../common';
import { PanelStatusBar } from '../components';
import { useLayoutPanels } from '../hooks';
import { savePanels } from '../services';
import { getLayoutItems, panelSize } from './getLayoutItems';
import { HandlerProps } from './LayoutHandleContext';

const bottomBarHeightKey = 'bottomBarHeight';

type LayoutContextActions = {
  togglePanel: (panelName: PanelName) => void;
  changePanelPosition: (panelName: PanelName, position: PanelPosition) => void;
  openedPanels: Record<PanelName, PanelInfo>;
};

export const LayoutContext = createContext<LayoutContextActions>(
  {} as LayoutContextActions
);

export function LayoutContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const { initialPanels, panels } = useLayoutPanels();
  const [openedPanels, setOpenedPanels] = useState<PanelRecord>(
    initialPanels.openedPanels
  );

  const getBottomBarSize = useCallback(() => {
    const bottomBarHeight = localStorage.getItem(bottomBarHeightKey);

    return bottomBarHeight
      ? Number(bottomBarHeight)
      : panelSize.maxBottomBarSize;
  }, []);

  const togglePanel = useCallback(
    (panelName: PanelName) => {
      const panel = openedPanels[panelName];
      if (!panel) return;

      const updatedPanels = Object.assign({}, openedPanels);
      updatedPanels[panelName].isActive = !panel.isActive;

      setOpenedPanels(updatedPanels);
      savePanels(updatedPanels);
    },
    [openedPanels]
  );

  const changePanelPosition = useCallback(
    (panelName: PanelName, position: PanelPosition) => {
      const panel = openedPanels[panelName];
      if (!panel) return;

      const updatedPanels = Object.assign({}, openedPanels);
      updatedPanels[panelName].position = position;

      setOpenedPanels(updatedPanels);
      savePanels(updatedPanels);
    },
    [openedPanels]
  );

  const resetBottomBarSize = useCallback((e: HandlerProps) => {
    const domElement = e.domElement as HTMLElement;
    if (domElement.offsetHeight) {
      localStorage.setItem(
        bottomBarHeightKey,
        domElement.offsetHeight.toString()
      );
    }
  }, []);

  const { items, bottomPanelsMin, bottomPanels } = useMemo(
    () => getLayoutItems(openedPanels, panels),
    // below triggers, not dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openedPanels]
  );

  const value = useMemo(
    () => ({ togglePanel, changePanelPosition, openedPanels }),
    [togglePanel, changePanelPosition, openedPanels]
  );

  return (
    <LayoutContext.Provider value={value}>
      {children}
      <ReflexContainer orientation="horizontal" windowResizeAware>
        <ReflexElement>
          <ReflexContainer orientation="vertical" windowResizeAware>
            {items}
          </ReflexContainer>
        </ReflexElement>
        {bottomPanels.length && <ReflexSplitter />}
        {bottomPanels.length && (
          <ReflexElement
            className="flex flex-col flex-1"
            direction={-1}
            minSize={panelSize.minBottomBarSize}
            size={getBottomBarSize()}
            onStopResize={resetBottomBarSize}
          >
            {getBottomBarSize() > panelSize.minBottomBarSize && (
              <ReflexContainer orientation="vertical">
                {bottomPanels}
              </ReflexContainer>
            )}
          </ReflexElement>
        )}
        {bottomPanelsMin.length && (
          <ReflexElement
            size={panelSize.collapsedBarSize}
            style={{ minHeight: panelSize.collapsedBarSize }}
          >
            <ReflexContainer orientation="horizontal" windowResizeAware>
              <PanelStatusBar
                panels={bottomPanelsMin}
                position={PanelPosition.Bottom}
              />
            </ReflexContainer>
          </ReflexElement>
        )}
      </ReflexContainer>
    </LayoutContext.Provider>
  );
}
