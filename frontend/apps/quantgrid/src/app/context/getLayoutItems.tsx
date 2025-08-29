import classNames from 'classnames';
import { ReflexContainer, ReflexElement, ReflexSplitter } from 'react-reflex';

import {
  MinimizedPanelProps,
  PanelName,
  PanelPosition,
  PanelPositionProps,
  PanelRecord,
  PanelSettings,
} from '../common';
import { PanelStatusBar, SpreadsheetWrapper } from '../components';
import { HandleProvider, HandlerProps } from '.';

const defaultEnvLeftPanelSize = window.externalEnv.defaultLeftPanelSize;
const defaultEnvRightPanelSize = window.externalEnv.defaultRightPanelSize;

export const panelSize = {
  leftMinSize: 250,
  leftSize: defaultEnvLeftPanelSize ?? 550,
  rightMinSize: 250,
  rightSize: defaultEnvRightPanelSize ?? 550,
  collapsedBarSize: 60,
  collapsedBarSizeWithoutText: 48,
  collapsedBottomBarSize: 23,
  minBottomBarSize: 20,
  maxBottomBarSize: 300,
};

const rightBarSizeKey = 'rightBarSize';
const leftBarSizeKey = 'leftBarSize';

export function getLayoutItems({
  openedPanels,
  panels,
  expandedPanelSide,
  onResizePanelSide,
  collapsedPanelsTextHidden,
}: {
  openedPanels: PanelRecord;
  panels: PanelSettings;
  expandedPanelSide: PanelPosition | null;
  onResizePanelSide: () => void;
  collapsedPanelsTextHidden: boolean;
}) {
  const positions: Record<string, PanelPositionProps> = {
    [PanelPosition.Left]: {
      active: [],
      minimized: [],
    },
    [PanelPosition.Right]: {
      active: [],
      minimized: [],
    },
    [PanelPosition.Bottom]: {
      active: [],
      minimized: [],
    },
  };
  const activeAmount = {
    [PanelPosition.Left]: 0,
    [PanelPosition.Right]: 0,
    [PanelPosition.Bottom]: 0,
  };
  for (const [name, panelInfo] of Object.entries(openedPanels)) {
    const panelName = name as PanelName;
    const panel = panels[panelName];
    if (!panel || panel.inactive) continue;

    const position =
      panelInfo.position ||
      panels[panelName]?.initialPosition ||
      PanelPosition.Right;
    const isActive = panelInfo.isActive || openedPanels[panelName]?.isActive;

    let hasSplitter = false;
    hasSplitter = activeAmount[position] !== 0;
    if (hasSplitter) {
      positions[position].active.push(
        <ReflexSplitter
          key={`splitter-${
            isActive ? 'active' : 'inactive'
          }-before-${panelName}`}
          propagate={true}
          style={
            isActive
              ? undefined
              : {
                  display: 'none',
                }
          }
        />
      );
    }
    if (isActive) {
      activeAmount[position]++;
    }
    positions[position].active.push(
      <ReflexElement
        flex={!isActive ? 0.001 : undefined}
        key={`panel-${name}-content`}
        maxSize={!isActive ? 1 : undefined}
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - use not documented prop withHandle
        withHandle={true}
        onStartResize={() => (document.body.style.userSelect = 'none')}
        onStopResize={() => (document.body.style.userSelect = 'auto')}
      >
        <HandleProvider hasSplitter={hasSplitter}>
          <panel.component
            isActive={isActive}
            panelName={panelName}
            position={position}
            title={panel.title}
          />
        </HandleProvider>
      </ReflexElement>
    );

    positions[position].minimized.push({
      name: panelName,
      title: panel.title,
      icon: panel.icon,
    });
  }

  // We need to add any element which will take all empty space when no any active panels
  // otherwise reflex library working incorrectly
  for (const position of [
    PanelPosition.Left,
    PanelPosition.Right,
    PanelPosition.Bottom,
  ]) {
    if (activeAmount[position] === 0) {
      positions[position].active.push(
        <ReflexElement
          className="bg-strokeTertiary"
          flex={1}
          key={`panel-empty-content`}
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - use not documented prop withHandle
          withHandle={true}
        >
          <div></div>
        </ReflexElement>
      );
    }
  }

  const leftPanels = positions[PanelPosition.Left].active;
  const leftPanelsMin = positions[PanelPosition.Left].minimized;
  const rightPanels = positions[PanelPosition.Right].active;
  const rightPanelsMin = positions[PanelPosition.Right].minimized;

  const items = [];
  const collapsedBarSize = collapsedPanelsTextHidden
    ? panelSize.collapsedBarSizeWithoutText
    : panelSize.collapsedBarSize;

  if (leftPanelsMin.length) {
    items.push(
      <ReflexElement
        key={`left-minimized-${collapsedPanelsTextHidden}`}
        size={collapsedBarSize}
      >
        <PanelStatusBar
          collapsedPanelsTextHidden={collapsedPanelsTextHidden}
          panels={leftPanelsMin}
          position={PanelPosition.Left}
        />
      </ReflexElement>
    );
  }
  if (leftPanels.length) {
    const flex = !activeAmount[PanelPosition.Left]
      ? 0.0001
      : expandedPanelSide === PanelPosition.Left
      ? 1
      : undefined;
    const size = activeAmount[PanelPosition.Left]
      ? expandedPanelSide === PanelPosition.Left
        ? undefined
        : getPanelWidth(leftBarSizeKey, panelSize.leftSize)
      : undefined;
    const minSize = activeAmount[PanelPosition.Left]
      ? expandedPanelSide === PanelPosition.Left
        ? undefined
        : panelSize.leftMinSize
      : undefined;

    items.push(
      <ReflexElement
        flex={flex}
        key="left-stack"
        minSize={minSize}
        size={size}
        onStartResize={() => (document.body.style.userSelect = 'none')}
        onStopResize={(e) => {
          document.body.style.userSelect = 'auto';
          onResizePanelSide();
          saveLeftPanelSize(e);
        }}
      >
        <ReflexContainer orientation="horizontal" windowResizeAware>
          {leftPanels}
        </ReflexContainer>
      </ReflexElement>
    );
    if (activeAmount[PanelPosition.Left]) {
      items.push(<ReflexSplitter key="left-splitter" />);
    }
  }
  items.push(
    <ReflexElement
      className="flex flex-col w-0 flex-1 relative"
      key="main-content"
    >
      <SpreadsheetWrapper />
    </ReflexElement>
  );

  if (rightPanels.length) {
    if (activeAmount[PanelPosition.Right]) {
      items.push(<ReflexSplitter key="right-splitter" />);
    }

    const flex = !activeAmount[PanelPosition.Right]
      ? 0.0001
      : expandedPanelSide === PanelPosition.Right
      ? 1
      : undefined;
    const size = activeAmount[PanelPosition.Right]
      ? expandedPanelSide === PanelPosition.Right
        ? undefined
        : getPanelWidth(rightBarSizeKey, panelSize.rightSize)
      : undefined;
    const minSize = activeAmount[PanelPosition.Right]
      ? expandedPanelSide === PanelPosition.Right
        ? undefined
        : panelSize.rightMinSize
      : undefined;

    items.push(
      <ReflexElement
        flex={flex}
        key="right-stack"
        minSize={minSize}
        size={size}
        onStartResize={() => (document.body.style.userSelect = 'none')}
        onStopResize={(e) => {
          document.body.style.userSelect = 'auto';
          onResizePanelSide();
          saveRightPanelSize(e);
        }}
      >
        <ReflexContainer orientation="horizontal">
          {rightPanels}
        </ReflexContainer>
      </ReflexElement>
    );
  }

  if (rightPanelsMin.length) {
    items.push(
      <ReflexElement
        key={`right-minimized-${collapsedPanelsTextHidden}`}
        size={collapsedBarSize}
      >
        <PanelStatusBar
          collapsedPanelsTextHidden={collapsedPanelsTextHidden}
          panels={rightPanelsMin}
          position={PanelPosition.Right}
        />
      </ReflexElement>
    );
  }

  return {
    items,
    bottomPanels: positions[PanelPosition.Bottom].active,
    bottomPanelsActiveLength: activeAmount[PanelPosition.Bottom],
    bottomPanelsMin: positions[PanelPosition.Bottom].minimized,
  };
}

function getPanelWidth(key: string, defaultSize: number) {
  const size = localStorage.getItem(key);

  return size ? Number(size) : defaultSize;
}

function saveRightPanelSize(e: HandlerProps) {
  return savePanelSize(e, rightBarSizeKey);
}

function saveLeftPanelSize(e: HandlerProps) {
  return savePanelSize(e, leftBarSizeKey);
}

function savePanelSize(e: HandlerProps, key: string) {
  const domElement = e.domElement as HTMLElement;
  if (domElement.offsetWidth) {
    localStorage.setItem(key, domElement.offsetWidth.toString());
  }
}

export const getMobileLayoutPanels = ({
  openedPanels,
  panels,
}: {
  openedPanels: PanelRecord;
  panels: PanelSettings;
}) => {
  const finalPanels = [];
  const minimizedPanels: (MinimizedPanelProps & { isActive: boolean })[] = [];
  const mobileOrder = [
    { key: PanelName.Chat, value: openedPanels.chat },
    { key: PanelName.CodeEditor, value: openedPanels.editor },
    { key: PanelName.Project, value: openedPanels.project },
    { key: PanelName.Errors, value: openedPanels.error },
    { key: PanelName.UndoRedo, value: openedPanels.undoRedo },
    { key: PanelName.Details, value: openedPanels.details },
  ];

  for (const { key: name, value: panelInfo } of mobileOrder) {
    const panelName = name as PanelName;
    const panel = panels[panelName];
    if (!panel || panel.inactive) continue;

    const isActive = panelInfo.isActive || openedPanels[panelName]?.isActive;

    finalPanels.push(
      <div
        className={classNames('size-full', !isActive && 'hidden')}
        key={panelName}
      >
        <panel.component
          isActive={isActive}
          panelName={panelName}
          title={panel.title}
        />
      </div>
    );

    minimizedPanels.push({
      name: panelName,
      title: panel.title,
      icon: panel.icon,
      isActive,
    });
  }

  return {
    mobilePanels: finalPanels,
    mobileMinimizedPanels: minimizedPanels,
    isMobileActivePanels:
      minimizedPanels.filter((item) => item.isActive).length > 0,
  };
};
