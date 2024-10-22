import { useCallback, useContext, useEffect, useMemo } from 'react';

import {
  isModalOpen,
  Shortcut,
  shortcutApi,
  ShortcutHandlersMap,
} from '@frontend/common';
import { isNoteOpen } from '@frontend/spreadsheet';

import { PanelName } from '../common';
import {
  AppContext,
  LayoutContext,
  ProjectContext,
  SearchWindowContext,
  UndoRedoContext,
} from '../context';
import { useGridApi } from './useGridApi';
import { useProjectActions } from './useProjectActions';

const disabledShortcutsOnCellEditorOpen = [
  Shortcut.RedoAction,
  Shortcut.UndoAction,
];

export function useShortcuts() {
  const { togglePanel } = useContext(LayoutContext);
  const { undo, redo } = useContext(UndoRedoContext);
  const { toggleChat, updateZoomWithWheel, updateZoom, chatWindowPlacement } =
    useContext(AppContext);
  const { isAIPendingChanges } = useContext(ProjectContext);
  const gridApi = useGridApi();
  const { openSearchWindow } = useContext(SearchWindowContext);

  const { createProjectAction } = useProjectActions();

  const handleToggleChat = useCallback(() => {
    if (chatWindowPlacement === 'panel') {
      togglePanel(PanelName.Chat);
    } else {
      toggleChat();
    }
  }, [toggleChat, chatWindowPlacement, togglePanel]);

  const shortcutGlobalHandlersMap: Partial<ShortcutHandlersMap> = useMemo(
    () => ({
      [Shortcut.NewProject]: () => createProjectAction(),
      [Shortcut.ToggleProjects]: () => togglePanel(PanelName.ProjectTree),
      [Shortcut.ToggleCodeEditor]: () => togglePanel(PanelName.CodeEditor),
      [Shortcut.ToggleInputs]: () => togglePanel(PanelName.Inputs),
      [Shortcut.ToggleErrors]: () => togglePanel(PanelName.Errors),
      [Shortcut.ToggleHistory]: () => togglePanel(PanelName.UndoRedo),
      [Shortcut.ToggleChat]: () => handleToggleChat(),
      [Shortcut.RedoAction]: () => redo(),
      [Shortcut.UndoAction]: () => undo(),
      [Shortcut.ZoomIn]: () => updateZoomWithWheel(1),
      [Shortcut.ZoomOut]: () => updateZoomWithWheel(-1),
      [Shortcut.ZoomReset]: () => updateZoom(1),
      [Shortcut.SearchWindow]: () => openSearchWindow(),
    }),
    [
      createProjectAction,
      togglePanel,
      handleToggleChat,
      redo,
      undo,
      updateZoomWithWheel,
      updateZoom,
      openSearchWindow,
    ]
  );

  const handleEvent = useCallback(
    (event: KeyboardEvent) => {
      for (const shortcut of disabledShortcutsOnCellEditorOpen) {
        const validShortcut = shortcutApi.is(shortcut as Shortcut, event);

        if (
          validShortcut &&
          (gridApi?.isCellEditorOpen() || isModalOpen() || isNoteOpen())
        )
          return;
      }

      for (const shortcutKey in shortcutGlobalHandlersMap) {
        if (shortcutApi.is(shortcutKey as Shortcut, event)) {
          const isUndoAIPromptHandle =
            [Shortcut.UndoAction, Shortcut.RedoAction].includes(
              shortcutKey as Shortcut
            ) && isAIPendingChanges;

          if (isNoteOpen() || isUndoAIPromptHandle) break;

          shortcutGlobalHandlersMap[shortcutKey as Shortcut]?.(event);

          // Don't prevent default for Delete/Backspace (not to block these keys in other inputs)
          if (
            shortcutKey !== Shortcut.Delete &&
            shortcutKey !== Shortcut.Backspace
          ) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }

          break;
        }
      }
    },
    [gridApi, isAIPendingChanges, shortcutGlobalHandlersMap]
  );

  const handleWheelEvent = useCallback(
    (event: WheelEvent) => {
      if (event.ctrlKey) {
        updateZoomWithWheel(event.deltaY > 0 ? -1 : 1);
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    [updateZoomWithWheel]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleEvent);
    // Note: this is impossible to prevent default browser zoom with events on window, document, etc.
    document
      .getElementById('root')
      ?.addEventListener('wheel', handleWheelEvent);

    return () => {
      document.removeEventListener('keydown', handleEvent);
      document
        .getElementById('root')
        ?.removeEventListener('wheel', handleWheelEvent);
    };
  }, [handleEvent, handleWheelEvent]);
}
