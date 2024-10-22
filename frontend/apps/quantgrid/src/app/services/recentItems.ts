import { PanelRecord } from '../common';

export const loadPanels = () => {
  const panelsLayout = localStorage.getItem('panelsLayout');

  if (!panelsLayout) return;

  return JSON.parse(panelsLayout);
};

export const savePanels = (panels: PanelRecord) => {
  return localStorage.setItem('panelsLayout', JSON.stringify(panels));
};
