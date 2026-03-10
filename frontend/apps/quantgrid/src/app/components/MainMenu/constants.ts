import { PanelName } from '../../common';

export const togglePanelKeys: Record<string, PanelName> = {
  ToggleProject: PanelName.Project,
  ToggleCodeEditor: PanelName.CodeEditor,
  ToggleErrorPanel: PanelName.Errors,
  ToggleHistoryPanel: PanelName.UndoRedo,
  ToggleChartPanel: PanelName.Details,
};

export const fileMenuKeys = {
  createProject: 'CreateProject',
  deleteProject: 'DeleteProject',
  closeProject: 'CloseProject',
  shareProject: 'Share project',
  cloneProject: 'CloneProject',
  downloadProject: 'DownloadProject',
  createWorksheet: 'CreateWorksheet',
  clearProjectHistory: 'Clear project history',
  openProject: 'OpenProject',
  viewAllProjects: 'ViewAllProjects',
  makeReadonly: 'MakeReadonly',
};

export const editMenuKeys = {
  undo: 'Undo',
  redo: 'Redo',
  search: 'Search',
  deleteWorksheet: 'DeleteWorksheet',
  renameWorksheet: 'RenameWorksheet',
  renameProject: 'RenameProject',
};

export const viewMenuKeys = {
  toggleChat: 'ToggleChat',
  togglePanelLabels: 'TogglePanelLabels',
  toggleSplitPanels: 'ToggleSplitPanels',
  ToggleChatPlacement: 'ToggleChatPlacement',
  resetSheetColumns: 'Reset spreadsheet columns',
};

export const insertMenuKeys = {
  control: 'Control',
  table: 'Table',
  chart: 'Chart',
  newField: 'NewField',
  insertLeft: 'InsertLeft',
  insertRight: 'InsertRight',
  newRow: 'NewRow',
  newRowAbove: 'NewRowAbove',
  newRowBelow: 'NewRowBelow',
};

export const helpMenuKeys = {
  shortcuts: 'Shortcuts',
};
