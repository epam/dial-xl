import { useMemo } from 'react';

import {
  CodeOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  HistoryOutlined,
  WechatOutlined,
} from '@ant-design/icons';

import { PanelName, PanelPosition, PanelSettings } from '../common';
import {
  ChatPanel,
  CodeEditorPanel,
  ErrorPanel,
  InputsPanel,
  ProjectTreePanel,
  UndoRedoPanel,
} from '../components';
import { loadPanels } from '../services';

export function useLayoutPanels() {
  const initialPanels = useMemo(
    () => ({
      openedPanels: Object.assign(
        {
          [PanelName.ProjectTree]: {
            isActive: true,
            position: PanelPosition.Left,
          },
          [PanelName.Inputs]: {
            isActive: false,
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
        icon: <DatabaseOutlined />,
        title: 'Project',
        initialPosition: PanelPosition.Left,
      },
      [PanelName.Errors]: {
        component: ErrorPanel,
        icon: <ExclamationCircleOutlined />,
        title: 'Errors',
        initialPosition: PanelPosition.Right,
      },
      [PanelName.Inputs]: {
        component: InputsPanel,
        icon: <FileTextOutlined />,
        title: 'Inputs',
        initialPosition: PanelPosition.Left,
      },
      [PanelName.Chat]: {
        component: ChatPanel,
        icon: <WechatOutlined />,
        title: 'Chat',
        initialPosition: PanelPosition.Left,
      },
      [PanelName.CodeEditor]: {
        component: CodeEditorPanel,
        icon: <CodeOutlined />,
        title: 'Editor',
        initialPosition: PanelPosition.Right,
      },
      [PanelName.UndoRedo]: {
        component: UndoRedoPanel,
        icon: <HistoryOutlined />,
        title: 'History',
        initialPosition: PanelPosition.Right,
      },
    }),
    []
  );

  return { initialPanels, panels };
}
