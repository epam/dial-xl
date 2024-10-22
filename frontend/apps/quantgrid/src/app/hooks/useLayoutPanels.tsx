import { useContext, useMemo } from 'react';

import { PanelName, PanelPosition, PanelSettings } from '../common';
import {
  ChatPanel,
  CodeEditorPanel,
  ErrorPanel,
  InputsPanel,
  ProjectTreePanel,
  UndoRedoPanel,
} from '../components';
import { AppContext } from '../context';
import { loadPanels } from '../services';

export function useLayoutPanels() {
  const { chatWindowPlacement } = useContext(AppContext);

  const initialPanels = useMemo(
    () => ({
      openedPanels: Object.assign(
        {
          [PanelName.ProjectTree]: {
            isActive: true,
            position: PanelPosition.Left,
          },
          [PanelName.Inputs]: {
            isActive: true,
            position: PanelPosition.Left,
          },
          [PanelName.Errors]: {
            isActive: false,
            position: PanelPosition.Right,
          },
          [PanelName.CodeEditor]: {
            isActive: false,
            position: PanelPosition.Right,
          },
          [PanelName.UndoRedo]: {
            isActive: false,
            position: PanelPosition.Right,
          },
          [PanelName.Chat]: {
            isActive: false,
            position: PanelPosition.Left,
          },
        },
        loadPanels()
      ),
    }),
    []
  );

  const panels: PanelSettings = useMemo(
    () => ({
      [PanelName.ProjectTree]: {
        component: ProjectTreePanel,
        title: 'Project',
        initialPosition: PanelPosition.Left,
      },
      [PanelName.Errors]: {
        component: ErrorPanel,
        title: 'Errors',
        initialPosition: PanelPosition.Right,
      },
      [PanelName.Inputs]: {
        component: InputsPanel,
        title: 'Inputs',
        initialPosition: PanelPosition.Left,
      },
      [PanelName.CodeEditor]: {
        component: CodeEditorPanel,
        title: 'Editor',
        initialPosition: PanelPosition.Right,
      },
      [PanelName.UndoRedo]: {
        component: UndoRedoPanel,
        title: 'History',
        initialPosition: PanelPosition.Right,
      },
      [PanelName.Chat]: {
        component: ChatPanel,
        title: 'Chat',
        initialPosition: PanelPosition.Left,
        inactive: chatWindowPlacement === 'floating',
      },
    }),
    [chatWindowPlacement]
  );

  return { initialPanels, panels };
}
