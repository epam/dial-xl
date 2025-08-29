import classNames from 'classnames';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ReflexContainer, ReflexElement, ReflexSplitter } from 'react-reflex';

import { useIsMobile } from '@frontend/common';

import { PanelInfo, PanelName, PanelPosition, PanelRecord } from '../common';
import {
  MobilePanelStatusBar,
  PanelStatusBar,
  SpreadsheetWrapper,
} from '../components';
import { useLayoutPanels } from '../hooks';
import { savePanels } from '../services';
import { AppContext } from './AppContext';
import { CommonContext } from './CommonContext';
import {
  getLayoutItems,
  getMobileLayoutPanels,
  panelSize,
} from './getLayoutItems';
import { HandlerProps } from './LayoutHandleContext';

const bottomBarHeightKey = 'bottomBarHeight';
const splitPanelsEnabledKey = 'splitPanelsEnabled';
const collapsedBarTextHiddenKey = 'collapsedBarTextHidden';

export type LayoutContextActions = {
  togglePanel: (panelName: PanelName) => void;
  toggleExpandPanel: (panelName: PanelName) => void;
  openPanel: (panelName: PanelName) => void;
  changePanelPosition: (panelName: PanelName, position: PanelPosition) => void;
  openedPanels: Record<PanelName, PanelInfo>;
  expandedPanelSide: PanelPosition | null;
  collapsedPanelsTextHidden: boolean;
  updateCollapsedPanelsTextHidden: (value: boolean) => void;
  panelsSplitEnabled: boolean;
  updateSplitPanelsEnabled: (value: boolean) => void;
  closeAllPanels: () => void;
};

export const LayoutContext = createContext<LayoutContextActions>(
  {} as LayoutContextActions
);

export function LayoutContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const { sharedRef } = useContext(CommonContext);
  const { chatWindowPlacement } = useContext(AppContext);
  const { initialPanels, panels } = useLayoutPanels();
  const [openedPanels, setOpenedPanels] = useState<PanelRecord>(
    initialPanels.openedPanels
  );
  const [expandedPanelSide, setExpandedPanelSide] =
    useState<PanelPosition | null>(null);
  const beforeExpandOpenedPanelsRef = useRef<PanelRecord | null>(null);
  const [collapsedPanelsTextHidden, setCollapsedPanelsTextHidden] = useState(
    localStorage.getItem(collapsedBarTextHiddenKey) === 'true'
  );
  const [splitPanelsEnabled, setSplitPanelsEnabled] = useState(
    localStorage.getItem(splitPanelsEnabledKey) === 'true'
  );

  // Same breakpoint as tailwind `md`
  const isMobile = useIsMobile();

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

      const previouslyOpened = panel.isActive;
      const updatedPanels = Object.assign({}, openedPanels);
      updatedPanels[panelName].isActive = !previouslyOpened;

      if ((isMobile || !splitPanelsEnabled) && !previouslyOpened) {
        Object.keys(updatedPanels).forEach((key) => {
          const position = updatedPanels[key as PanelName].position;
          if (key !== panelName && (position === panel.position || isMobile)) {
            updatedPanels[key as PanelName].isActive = false;
          }
        });
      }

      setExpandedPanelSide(null);
      setOpenedPanels(updatedPanels);
      savePanels(updatedPanels);
    },
    [isMobile, openedPanels, splitPanelsEnabled]
  );

  const toggleExpandPanel = useCallback(
    (panelName: PanelName) => {
      const panel = openedPanels[panelName];
      const panelPosition = panel.position;
      const isExpanded = !!expandedPanelSide;
      if (!panel || !panelPosition) return;

      const updatedPanels = Object.assign({}, openedPanels);
      const copyOpenedPanels = JSON.parse(JSON.stringify(openedPanels));

      for (const panelKey of Object.keys(openedPanels)) {
        if (panelKey !== panelName) {
          updatedPanels[panelKey as PanelName].isActive = isExpanded
            ? beforeExpandOpenedPanelsRef.current?.[panelKey as PanelName]
                .isActive ?? false
            : false;
        }
      }

      beforeExpandOpenedPanelsRef.current = !isExpanded
        ? copyOpenedPanels
        : null;
      setExpandedPanelSide(!isExpanded ? panelPosition : null);
      setOpenedPanels(updatedPanels);
      savePanels(updatedPanels);
    },
    [expandedPanelSide, openedPanels]
  );

  const closeAllPanels = useCallback(() => {
    const updatedPanels = Object.assign({}, openedPanels);
    Object.keys(updatedPanels).forEach((key) => {
      updatedPanels[key as PanelName].isActive = false;
    });

    setExpandedPanelSide(null);
    setOpenedPanels(updatedPanels);
    savePanels(updatedPanels);
  }, [openedPanels]);

  const openPanel = useCallback(
    (panelName: PanelName) => {
      const panel = openedPanels[panelName];
      if (!panel) return;

      const updatedPanels = Object.assign({}, openedPanels);
      updatedPanels[panelName].isActive = true;

      if (isMobile || !splitPanelsEnabled) {
        Object.keys(updatedPanels).forEach((key) => {
          const position = updatedPanels[key as PanelName].position;
          if (key !== panelName && position === panel.position) {
            updatedPanels[key as PanelName].isActive = false;
          }
        });
      }

      setExpandedPanelSide(null);
      setOpenedPanels(updatedPanels);
      savePanels(updatedPanels);
    },
    [isMobile, openedPanels, splitPanelsEnabled]
  );

  const changePanelPosition = useCallback(
    (panelName: PanelName, panelPosition: PanelPosition) => {
      const panel = openedPanels[panelName];
      if (!panel) return;

      const updatedPanels = Object.assign({}, openedPanels);
      updatedPanels[panelName].position = panelPosition;

      if ((isMobile || !splitPanelsEnabled) && panel.isActive) {
        Object.keys(updatedPanels).forEach((key) => {
          const position = updatedPanels[key as PanelName].position;
          if (key !== panelName && position === panelPosition) {
            updatedPanels[key as PanelName].isActive = false;
          }
        });
      }

      setExpandedPanelSide(null);
      setOpenedPanels(updatedPanels);
      savePanels(updatedPanels);
    },
    [isMobile, openedPanels, splitPanelsEnabled]
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

  const onResizeSidePanel = useCallback(() => {
    setExpandedPanelSide(null);
  }, []);

  const updateCollapsedPanelsTextHidden = useCallback((value: boolean) => {
    setCollapsedPanelsTextHidden(value);

    localStorage.setItem(collapsedBarTextHiddenKey, JSON.stringify(value));

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 0);
  }, []);

  const updateSplitPanelsEnabled = useCallback(
    (value: boolean) => {
      setSplitPanelsEnabled(value);

      if (!value) {
        const leftOpenedPanel = Object.entries(openedPanels).find(
          ([_, panel]) =>
            panel.isActive && panel.position === PanelPosition.Left
        );
        const rightOpenedPanel = Object.entries(openedPanels).find(
          ([_, panel]) =>
            panel.isActive && panel.position === PanelPosition.Right
        );
        const bottomOpenedPanel = Object.entries(openedPanels).find(
          ([_, panel]) =>
            panel.isActive && panel.position === PanelPosition.Bottom
        );
        const leftPanelNames = [
          leftOpenedPanel?.[0],
          rightOpenedPanel?.[0],
          bottomOpenedPanel?.[0],
        ].filter(Boolean);

        const updatedPanels = Object.assign({}, openedPanels);
        Object.entries(openedPanels).forEach(([key, panel]) => {
          if (!leftPanelNames.includes(key)) {
            updatedPanels[key as PanelName].isActive = false;
          }
        });

        setOpenedPanels(updatedPanels);
        savePanels(updatedPanels);
      }

      localStorage.setItem(splitPanelsEnabledKey, JSON.stringify(value));
    },
    [openedPanels]
  );

  useEffect(() => {
    if (chatWindowPlacement === 'floating')
      changePanelPosition(PanelName.Chat, PanelPosition.Left);
    // below triggers, not dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatWindowPlacement]);

  const { items, bottomPanelsMin, bottomPanels, bottomPanelsActiveLength } =
    useMemo(
      () =>
        getLayoutItems({
          openedPanels,
          panels,
          expandedPanelSide,
          onResizePanelSide: onResizeSidePanel,
          collapsedPanelsTextHidden,
        }),
      // below triggers, not dependencies
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        openedPanels,
        panels,
        expandedPanelSide,
        collapsedPanelsTextHidden,
        splitPanelsEnabled,
      ]
    );

  const { mobilePanels, mobileMinimizedPanels, isMobileActivePanels } =
    useMemo(() => {
      return getMobileLayoutPanels({
        openedPanels,
        panels,
      });
    }, [openedPanels, panels]);

  const value = useMemo(
    () => ({
      togglePanel,
      openPanel,
      toggleExpandPanel,
      expandedPanelSide,
      changePanelPosition,
      openedPanels,
      collapsedPanelsTextHidden,
      updateCollapsedPanelsTextHidden,
      panelsSplitEnabled: splitPanelsEnabled,
      updateSplitPanelsEnabled,
      closeAllPanels,
    }),
    [
      togglePanel,
      openPanel,
      toggleExpandPanel,
      expandedPanelSide,
      changePanelPosition,
      openedPanels,
      collapsedPanelsTextHidden,
      updateCollapsedPanelsTextHidden,
      splitPanelsEnabled,
      updateSplitPanelsEnabled,
      closeAllPanels,
    ]
  );

  // Attach methods to the shared ref
  useEffect(() => {
    sharedRef.current.layoutContext = {
      closeAllPanels,
    };

    // Clean up when unmounted
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      delete sharedRef.current.layoutContext;
    };
  }, [sharedRef, closeAllPanels]);

  return isMobile ? (
    <LayoutContext.Provider value={value}>
      {children}

      <div className="grow max-h-[calc(100dvh-48px)]">
        <SpreadsheetWrapper />
      </div>

      <div
        className={classNames(
          isMobileActivePanels
            ? 'absolute z-10 top-0 left-0 w-full h-[calc(100dvh-48px)] shrink-0'
            : 'hidden'
        )}
      >
        {mobilePanels}
      </div>
      <MobilePanelStatusBar panels={mobileMinimizedPanels} />
    </LayoutContext.Provider>
  ) : (
    <LayoutContext.Provider value={value}>
      {children}
      <ReflexContainer orientation="horizontal" windowResizeAware>
        <ReflexElement>
          <ReflexContainer orientation="vertical" windowResizeAware>
            {items}
          </ReflexContainer>
        </ReflexElement>
        {bottomPanelsActiveLength && <ReflexSplitter />}
        <ReflexElement
          className="flex flex-col flex-1"
          direction={-1}
          flex={
            bottomPanelsActiveLength === 0
              ? 0.0001
              : expandedPanelSide === PanelPosition.Bottom
              ? 1
              : undefined
          }
          key={'bottom-stack'}
          minSize={
            bottomPanelsActiveLength
              ? expandedPanelSide === PanelPosition.Bottom
                ? undefined
                : panelSize.minBottomBarSize
              : undefined
          }
          size={
            bottomPanelsActiveLength
              ? expandedPanelSide === PanelPosition.Bottom
                ? undefined
                : getBottomBarSize()
              : undefined
          }
          onStartResize={() => (document.body.style.userSelect = 'none')}
          onStopResize={(e) => {
            document.body.style.userSelect = 'auto';
            onResizeSidePanel();
            resetBottomBarSize(e);
          }}
        >
          <ReflexContainer orientation="vertical">
            {bottomPanels}
          </ReflexContainer>
        </ReflexElement>
        {bottomPanelsMin.length && (
          <ReflexElement
            size={panelSize.collapsedBottomBarSize}
            style={{ minHeight: panelSize.collapsedBottomBarSize }}
          >
            <ReflexContainer orientation="horizontal" windowResizeAware>
              <PanelStatusBar
                collapsedPanelsTextHidden={collapsedPanelsTextHidden}
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
