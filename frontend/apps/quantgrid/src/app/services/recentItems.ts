import { PanelRecord } from '../common';

export const saveRecentProject = (projectName: string) => {
  localStorage.setItem('recentProject', projectName);
};

export const saveRecentSheet = (sheetName: string) => {
  localStorage.setItem('recentSheet', sheetName);
};

export const getRecentProject = () => {
  return localStorage.getItem('recentProject');
};

export const getRecentSheet = () => {
  return localStorage.getItem('recentSheet');
};

export const loadPanels = () => {
  const panelsLayout = localStorage.getItem('panelsLayout');

  if (!panelsLayout) return;

  return JSON.parse(panelsLayout);
};

export const savePanels = (panels: PanelRecord) => {
  return localStorage.setItem('panelsLayout', JSON.stringify(panels));
};
