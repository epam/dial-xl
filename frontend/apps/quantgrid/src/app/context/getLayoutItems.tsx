import { ReflexContainer, ReflexElement, ReflexSplitter } from 'react-reflex';

import {
  PanelName,
  PanelPosition,
  PanelPositionProps,
  PanelRecord,
  PanelSettings,
} from '../common';
import { PanelStatusBar, SpreadsheetWrapper } from '../components';
import { HandleProvider, HandlerProps } from '.';

export const panelSize = {
  leftMinSize: 250,
  leftSize: 250,
  rightMinSize: 250,
  rightSize: 250,
  collapsedBarSize: 24,
  minBottomBarSize: 26,
  maxBottomBarSize: 300,
};

const rightBarSizeKey = 'rightBarSize';
const leftBarSizeKey = 'leftBarSize';

export function getLayoutItems(
  openedPanels: PanelRecord,
  panels: PanelSettings
) {
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

  for (const [name, panelInfo] of Object.entries(openedPanels)) {
    const panelName = name as PanelName;
    const panel = panels[panelName];
    if (!panel) continue;

    const position =
      panelInfo.position ||
      panels[panelName]?.initialPosition ||
      PanelPosition.Right;
    const isActive = panelInfo.isActive || openedPanels[panelName]?.isActive;

    if (isActive) {
      const hasSplitter = positions[position].active.length !== 0;
      if (hasSplitter) {
        positions[position].active.push(
          <ReflexSplitter key={`splitter-before-${panelName}`} />
        );
      }
      positions[position].active.push(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - use not documented prop withHandle
        <ReflexElement key={`panel-${name}-content`} withHandle={true}>
          <HandleProvider hasSplitter={hasSplitter}>
            <panel.component
              panelName={panelName}
              position={position}
              title={panel.title}
            />
          </HandleProvider>
        </ReflexElement>
      );
    }

    positions[position].minimized.push({
      name: panelName,
      title: panel.title,
      icon: panel.icon,
    });
  }

  const leftPanels = positions[PanelPosition.Left].active;
  const leftPanelsMin = positions[PanelPosition.Left].minimized;
  const rightPanels = positions[PanelPosition.Right].active;
  const rightPanelsMin = positions[PanelPosition.Right].minimized;

  const items = [];

  if (leftPanelsMin.length) {
    items.push(
      <ReflexElement
        key="left-minimized"
        size={panelSize.collapsedBarSize}
        style={{ minWidth: panelSize.collapsedBarSize }}
      >
        <PanelStatusBar panels={leftPanelsMin} position={PanelPosition.Left} />
      </ReflexElement>
    );
  }
  if (leftPanels.length) {
    items.push(
      <ReflexElement
        key="left-stack"
        minSize={panelSize.leftMinSize}
        size={getPanelWidth(leftBarSizeKey, panelSize.leftSize)}
        onStopResize={saveLeftPanelSize}
      >
        <ReflexContainer orientation="horizontal" windowResizeAware>
          {leftPanels}
        </ReflexContainer>
      </ReflexElement>
    );
  }
  if (leftPanels.length) {
    items.push(<ReflexSplitter key="left-splitter" />);
  }
  items.push(
    <ReflexElement className="flex flex-col w-0 flex-1" key="main-content">
      <SpreadsheetWrapper />
    </ReflexElement>
  );

  if (rightPanels.length) {
    items.push(<ReflexSplitter key="right-splitter" />);
    items.push(
      <ReflexElement
        key="right-stack"
        minSize={panelSize.rightMinSize}
        size={getPanelWidth(rightBarSizeKey, panelSize.rightSize)}
        style={{ width: panelSize.collapsedBarSize }}
        onStopResize={saveRightPanelSize}
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
        key="right-minimized"
        size={panelSize.collapsedBarSize}
        style={{ minWidth: panelSize.collapsedBarSize }}
      >
        <PanelStatusBar
          panels={rightPanelsMin}
          position={PanelPosition.Right}
        />
      </ReflexElement>
    );
  }

  return {
    items,
    bottomPanels: positions[PanelPosition.Bottom].active,
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
