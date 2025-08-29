import { useContext, useMemo } from 'react';

import {
  AdjustmentsIcon,
  ChatIcon,
  ExclamationCircleIcon,
  HistoryIcon,
  ListTreeIcon,
  TagIcon,
} from '@frontend/common';

import {
  PanelName,
  PanelPosition,
  PanelRecord,
  PanelSettings,
  PanelTitle,
} from '../common';
import {
  ChatPanel,
  CodeEditorPanel,
  DetailsPanel,
  ErrorPanel,
  ProjectPanel,
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
      [PanelName.Project]: {
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
        title: PanelTitle[PanelName.Chat],
        initialPosition: PanelPosition.Left,
        icon: <ChatIcon />,
        inactive: chatWindowPlacement === 'floating',
      },
      [PanelName.Project]: {
        component: ProjectPanel,
        title: PanelTitle[PanelName.Project],
        initialPosition: PanelPosition.Right,
        icon: <ListTreeIcon />,
      },
      [PanelName.Errors]: {
        component: ErrorPanel,
        title: PanelTitle[PanelName.Errors],
        initialPosition: PanelPosition.Right,
        icon: <ExclamationCircleIcon />,
      },
      [PanelName.CodeEditor]: {
        component: CodeEditorPanel,
        title: PanelTitle[PanelName.CodeEditor],
        initialPosition: PanelPosition.Right,
        icon: <TagIcon />,
      },
      [PanelName.UndoRedo]: {
        component: UndoRedoPanel,
        title: PanelTitle[PanelName.UndoRedo],
        initialPosition: PanelPosition.Left,
        icon: <HistoryIcon />,
      },
      [PanelName.Details]: {
        component: DetailsPanel,
        title: PanelTitle[PanelName.Details],
        initialPosition: PanelPosition.Right,
        icon: <AdjustmentsIcon />,
      },
    }),
    [chatWindowPlacement]
  );

  return { initialPanels, panels };
}
