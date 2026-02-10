import { createContext } from 'react';

import { PanelInfo, PanelName, PanelPosition } from '../../common';

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
