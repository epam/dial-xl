import { useCallback, useContext, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { isNoteOpen } from '@frontend/canvas-spreadsheet';
import {
  isModalOpen,
  Shortcut,
  shortcutApi,
  ShortcutHandlersMap,
  zoomValues,
} from '@frontend/common';

import { PanelName } from '../common';
import { ChatOverlayContext, LayoutContext, UndoRedoContext } from '../context';
import {
  useSearchModalStore,
  useUIStore,
  useUserSettingsStore,
  useViewStore,
} from '../store';
import { defaultZoom } from '../utils';
import { useGridApi } from './useGridApi';
import { useProjectActions } from './useProjectActions';

const disabledShortcutsOnCellEditorOpen = [
  Shortcut.RedoAction,
  Shortcut.UndoAction,
];

export function useShortcuts() {
  const { togglePanel } = useContext(LayoutContext);
  const { undo, redo } = useContext(UndoRedoContext);
  const { setViewportInteractionMode, viewportInteractionMode } = useViewStore(
    useShallow((s) => ({
      setViewportInteractionMode: s.setViewportInteractionMode,
      viewportInteractionMode: s.viewportInteractionMode,
    })),
  );
  const { toggleChat } = useUIStore(
    useShallow((s) => ({
      toggleChat: s.toggleChat,
    })),
  );
  const chatWindowPlacement = useUserSettingsStore(
    (s) => s.data.chatWindowPlacement,
  );
  const { isAIPendingChanges } = useContext(ChatOverlayContext);
  const gridApi = useGridApi();
  const openSearchModal = useSearchModalStore((s) => s.open);
  const zoom = useUserSettingsStore((s) => s.data.zoom);
  const setSetting = useUserSettingsStore((s) => s.patch);

  const { createProjectAction } = useProjectActions();

  const handleToggleChat = useCallback(() => {
    if (chatWindowPlacement === 'panel') {
      togglePanel(PanelName.Chat);
    } else {
      toggleChat();
    }
  }, [toggleChat, chatWindowPlacement, togglePanel]);

  const updateZoomWithWheel = useCallback(
    (direction: number) => {
      const idx = zoomValues.findIndex((v) => v === zoom);
      const next = idx + direction;
      if (next < 0 || next >= zoomValues.length) return;

      setSetting({ zoom: zoomValues[next] });
    },
    [setSetting, zoom],
  );

  const shortcutGlobalHandlersMap: Partial<ShortcutHandlersMap> = useMemo(
    () => ({
      [Shortcut.NewProject]: () => createProjectAction(),
      [Shortcut.ToggleProjects]: () => togglePanel(PanelName.Project),
      [Shortcut.ToggleCodeEditor]: () => togglePanel(PanelName.CodeEditor),
      [Shortcut.ToggleErrors]: () => togglePanel(PanelName.Errors),
      [Shortcut.ToggleHistory]: () => togglePanel(PanelName.UndoRedo),
      [Shortcut.ToggleChat]: () => handleToggleChat(),
      [Shortcut.ToggleChart]: () => togglePanel(PanelName.Details),
      [Shortcut.RedoAction]: () => redo(),
      [Shortcut.UndoAction]: () => undo(),
      [Shortcut.ZoomIn]: () => updateZoomWithWheel(1),
      [Shortcut.ZoomOut]: () => updateZoomWithWheel(-1),
      [Shortcut.ZoomReset]: () => setSetting({ zoom: defaultZoom }),
      [Shortcut.SearchWindow]: () => openSearchModal(),
      [Shortcut.ChangeViewportInteractionMode]: () =>
        setViewportInteractionMode(
          viewportInteractionMode === 'select' ? 'pan' : 'select',
        ),

      // just prevent save web page on save
      [Shortcut.Save]: (e) => {
        e.preventDefault();
      },
    }),
    [
      createProjectAction,
      togglePanel,
      handleToggleChat,
      redo,
      undo,
      updateZoomWithWheel,
      setSetting,
      openSearchModal,
      setViewportInteractionMode,
      viewportInteractionMode,
    ],
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
              shortcutKey as Shortcut,
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
    [gridApi, isAIPendingChanges, shortcutGlobalHandlersMap],
  );

  const handleWheelEvent = useCallback(
    (event: WheelEvent) => {
      if (event.ctrlKey) {
        updateZoomWithWheel(event.deltaY > 0 ? -1 : 1);
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    [updateZoomWithWheel],
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
