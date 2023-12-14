import {
  AppstoreOutlined,
  EditFilled,
  FileOutlined,
  InfoCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  MenuItem,
  MenuItemProps,
  Shortcut,
  shortcutApi,
} from '@frontend/common';

import { PanelName } from '../../common';

export const togglePanelKeys: Record<string, PanelName> = {
  ToggleProjectTree: PanelName.ProjectTree,
  ToggleInputs: PanelName.Inputs,
  ToggleCodeEditor: PanelName.CodeEditor,
  ToggleErrorPanel: PanelName.Errors,
  ToggleHistoryPanel: PanelName.UndoRedo,
  ToggleChatPanel: PanelName.Chat,
};

export const fileMenuKeys = {
  createProject: 'CreateProject',
  openProject: 'OpenProject',
  deleteProject: 'DeleteProject',
  closeProject: 'CloseProject',
  createWorksheet: 'CreateWorksheet',
};

export const editMenuKeys = {
  undo: 'Undo',
  redo: 'Redo',
  search: 'Search',
  deleteWorksheet: 'DeleteWorksheet',
  renameWorksheet: 'RenameWorksheet',
  renameProject: 'RenameProject',
};

export const helpMenuKeys = {
  shortcuts: 'Shortcuts',
};

export const settingsKeys = {
  clearProjectHistory: 'Clear project history',
};

function getItem(props: MenuItemProps): MenuItem {
  const { label, key, icon, children, disabled, type, shortcut } = props;

  const buildLabel = shortcut ? (
    <div className="flex justify-between items-center">
      <span>{label}</span>
      <span className="ml-5 text-xs text-gray-400">{shortcut}</span>
    </div>
  ) : (
    label
  );

  return { key, icon, children, label: buildLabel, disabled, type } as MenuItem;
}

function insertDivider(): MenuItem {
  return { type: 'divider' };
}

export const menuItems: MenuItem[] = [
  getItem({
    label: 'File',
    key: 'FileMenu',
    icon: <FileOutlined />,
    children: [
      getItem({
        label: 'Create project',
        key: fileMenuKeys.createProject,
        shortcut: shortcutApi.getLabel(Shortcut.NewProject),
      }),
      getItem({
        label: 'Open project',
        key: fileMenuKeys.openProject,
      }),
      getItem({
        label: 'Create worksheet',
        key: fileMenuKeys.createWorksheet,
      }),
      insertDivider(),
      getItem({
        label: 'Delete project',
        key: fileMenuKeys.deleteProject,
      }),
      insertDivider(),
      getItem({
        label: 'Close project',
        key: fileMenuKeys.closeProject,
      }),
    ],
  }),

  getItem({
    label: 'Edit',
    key: 'EditMenu',
    icon: <EditFilled />,
    children: [
      getItem({
        label: 'Undo',
        key: editMenuKeys.undo,
        shortcut: shortcutApi.getLabel(Shortcut.UndoAction),
      }),
      getItem({
        label: 'Redo',
        key: editMenuKeys.redo,
        shortcut: shortcutApi.getLabel(Shortcut.RedoAction),
      }),
      insertDivider(),
      getItem({
        label: 'Search',
        key: editMenuKeys.search,
        shortcut: shortcutApi.getLabel(Shortcut.SearchWindow),
      }),
      insertDivider(),
      getItem({
        label: 'Rename Project',
        key: editMenuKeys.renameProject,
      }),
      insertDivider(),
      getItem({
        label: 'Rename Worksheet',
        key: editMenuKeys.renameWorksheet,
      }),
      getItem({
        label: 'Delete Worksheet',
        key: editMenuKeys.deleteWorksheet,
      }),
    ],
  }),

  getItem({
    label: 'View',
    key: 'ViewMenu',
    icon: <AppstoreOutlined />,
    children: [
      getItem({
        label: 'Panels',
        key: 'PanelMenu',
        children: [
          getItem({
            label: 'Toggle Project Tree',
            key: 'ToggleProjectTree',
            shortcut: shortcutApi.getLabel(Shortcut.ToggleProjects),
          }),
          getItem({
            label: 'Toggle Code Editor',
            key: 'ToggleCodeEditor',
            shortcut: shortcutApi.getLabel(Shortcut.ToggleCodeEditor),
          }),
          getItem({
            label: 'Toggle Inputs',
            key: 'ToggleInputs',
            shortcut: shortcutApi.getLabel(Shortcut.ToggleInputs),
          }),
          getItem({
            label: 'Toggle Error Panel',
            key: 'ToggleErrorPanel',
            shortcut: shortcutApi.getLabel(Shortcut.ToggleErrors),
          }),
          getItem({
            label: 'Toggle History Panel',
            key: 'ToggleHistoryPanel',
            shortcut: shortcutApi.getLabel(Shortcut.ToggleHistory),
          }),
          getItem({
            label: 'Toggle Chat Panel',
            key: 'ToggleChatPanel',
            shortcut: shortcutApi.getLabel(Shortcut.ToggleChat),
          }),
        ],
      }),
    ],
  }),

  getItem({
    label: 'Settings',
    key: 'Settings',
    icon: <SettingOutlined />,
    children: [
      getItem({
        label: 'Clear project history',
        key: settingsKeys.clearProjectHistory,
      }),
    ],
  }),

  getItem({
    label: 'Help',
    key: 'HelpMenu',
    icon: <InfoCircleOutlined />,
    children: [
      getItem({ label: 'Keyboard Shortcuts', key: helpMenuKeys.shortcuts }),
    ],
  }),
];
