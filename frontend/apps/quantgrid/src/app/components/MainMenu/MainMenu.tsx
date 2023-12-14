import { Menu } from 'antd';
import type { MenuInfo } from 'rc-menu/lib/interface';
import { useCallback, useContext, useRef } from 'react';

import { ModalRefFunction } from '../../common';
import {
  LayoutContext,
  SearchWindowContext,
  UndoRedoContext,
} from '../../context';
import { useProjectActions } from '../../hooks';
import { ShortcutsHelp } from '../ShortcutsHelp';
import {
  editMenuKeys,
  fileMenuKeys,
  helpMenuKeys,
  menuItems,
  settingsKeys,
  togglePanelKeys,
} from './MainMenuItems';

export function MainMenu() {
  const { togglePanel } = useContext(LayoutContext);
  const { clear, undo, redo } = useContext(UndoRedoContext);
  const { openSearchWindow } = useContext(SearchWindowContext);
  const projectAction = useProjectActions();

  const openShortcutHelpModal = useRef<ModalRefFunction | null>(null);

  const openShortcutHelp = useCallback(() => {
    openShortcutHelpModal.current?.();
  }, []);

  const onMenuItemClick = useCallback(
    (item: MenuInfo) => {
      const { key } = item;

      if (togglePanelKeys[key]) {
        togglePanel(togglePanelKeys[key]);

        return;
      }

      switch (key) {
        case fileMenuKeys.createProject:
          projectAction.createProjectAction();
          break;
        case fileMenuKeys.openProject:
          projectAction.openProjectAction();
          break;
        case fileMenuKeys.createWorksheet:
          projectAction.createWorksheetAction();
          break;
        case fileMenuKeys.deleteProject:
          projectAction.deleteProjectAction();
          break;
        case fileMenuKeys.closeProject:
          projectAction.closeProjectAction();
          break;
        case editMenuKeys.undo:
          undo();
          break;
        case editMenuKeys.redo:
          redo();
          break;
        case editMenuKeys.search:
          openSearchWindow();
          break;
        case editMenuKeys.renameWorksheet:
          projectAction.renameWorksheetAction();
          break;
        case editMenuKeys.deleteWorksheet:
          projectAction.deleteWorksheetAction();
          break;
        case editMenuKeys.renameProject:
          projectAction.renameProjectAction();
          break;
        case helpMenuKeys.shortcuts:
          openShortcutHelp();
          break;
        case settingsKeys.clearProjectHistory: {
          clear();
          break;
        }
      }
    },
    [
      togglePanel,
      projectAction,
      undo,
      redo,
      openSearchWindow,
      openShortcutHelp,
      clear,
    ]
  );

  return (
    <div className="min-w-[450px] select-none">
      <Menu
        items={menuItems}
        mode="horizontal"
        selectable={false}
        onClick={onMenuItemClick}
      ></Menu>
      <ShortcutsHelp openShortcutHelpModal={openShortcutHelpModal} />
    </div>
  );
}
