import { useContext, useMemo } from 'react';

import {
  AdjustmentsIcon,
  ChatIcon,
  ExclamationCircleIcon,
  FileIcon,
  HintStarIcon,
  HistoryIcon,
  ListTreeIcon,
  TagIcon,
} from '@frontend/common';

import {
  PanelName,
  PanelPosition,
  PanelRecord,
  PanelSettings,
} from '../common';
import {
  AIHintsPanel,
  ChartPanel,
  ChatPanel,
  CodeEditorPanel,
  ErrorPanel,
  InputsPanel,
  ProjectTreePanel,
  UndoRedoPanel,
} from '../components';
import { AppContext } from '../context';
import { loadPanels, loadPanelsEnvConfig } from '../services';

export function useLayoutPanels() {
  const { chatWindowPlacement } = useContext(AppContext);

  const initialPanels = useMemo(() => {
    const defaultAppPanelsConfig: PanelRecord = {
      [PanelName.Chat]: {
        isActive: true,
        position: PanelPosition.Left,
      },
      [PanelName.ProjectTree]: {
        isActive: false,
        position: PanelPosition.Right,
      },
      [PanelName.Inputs]: {
        isActive: false,
        position: PanelPosition.Right,
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
        position: PanelPosition.Left,
      },
      [PanelName.AIHints]: {
        isActive: false,
        position: PanelPosition.Left,
      },
      [PanelName.Details]: {
        isActive: false,
        position: PanelPosition.Right,
      },
    };

    const defaultEnvPanelsConfig = loadPanelsEnvConfig();
    const localStoragePanelsConfig = loadPanels();

    const defaultPanelConfig = Object.assign(
      defaultAppPanelsConfig,
      defaultEnvPanelsConfig
    );
    const finalPanelConfig = Object.assign(
      defaultPanelConfig,
      localStoragePanelsConfig
    );

    return { openedPanels: finalPanelConfig };
  }, []);

  const panels: PanelSettings = useMemo(
    () => ({
      [PanelName.Chat]: {
        component: ChatPanel,
        title: 'Chat',
        initialPosition: PanelPosition.Left,
        icon: <ChatIcon />,
        inactive: chatWindowPlacement === 'floating',
      },
      [PanelName.ProjectTree]: {
        component: ProjectTreePanel,
        title: 'Project',
        initialPosition: PanelPosition.Right,
        icon: <ListTreeIcon />,
      },
      [PanelName.Errors]: {
        component: ErrorPanel,
        title: 'Errors',
        initialPosition: PanelPosition.Right,
        icon: <ExclamationCircleIcon />,
      },
      [PanelName.Inputs]: {
        component: InputsPanel,
        title: 'Inputs',
        initialPosition: PanelPosition.Right,
        icon: <FileIcon />,
      },
      [PanelName.CodeEditor]: {
        component: CodeEditorPanel,
        title: 'Editor',
        initialPosition: PanelPosition.Right,
        icon: <TagIcon />,
      },
      [PanelName.UndoRedo]: {
        component: UndoRedoPanel,
        title: 'History',
        initialPosition: PanelPosition.Left,
        icon: <HistoryIcon />,
      },
      [PanelName.AIHints]: {
        component: AIHintsPanel,
        title: 'AI Hints',
        initialPosition: PanelPosition.Left,
        icon: <HintStarIcon />,
      },
      [PanelName.Details]: {
        component: ChartPanel,
        title: 'Details',
        initialPosition: PanelPosition.Right,
        icon: <AdjustmentsIcon />,
      },
    }),
    [chatWindowPlacement]
  );

  return { initialPanels, panels };
}
