import { useCallback, useContext, useEffect, useMemo } from 'react';

import { Shortcut, shortcutApi, ShortcutHandlersMap } from '@frontend/common';

import { PanelName } from '../common';
import {
  AppContext,
  LayoutContext,
  SearchWindowContext,
  SpreadsheetContext,
  UndoRedoContext,
} from '../context';
import { useManualEditDSL } from './useManualEditDSL';
import { useProjectActions } from './useProjectActions';
import { useSelectionMoveNextAvailable } from './useSelectionMoveNextAvailable';
import { useSelectionMoveToSheetStartOrEnd } from './useSelectionMoveToSheetStartOrEnd';

const disabledShortcutsOnCellEditorOpen = [
  Shortcut.RedoAction,
  Shortcut.UndoAction,
  Shortcut.MoveSelectionNextAvailableUp,
  Shortcut.MoveSelectionNextAvailableDown,
  Shortcut.MoveSelectionNextAvailableLeft,
  Shortcut.MoveSelectionNextAvailableRight,
];

export function useShortcuts() {
  const { togglePanel } = useContext(LayoutContext);
  const { undo, redo } = useContext(UndoRedoContext);
  const { updateZoomWithWheel, updateZoom } = useContext(AppContext);
  const { gridApi } = useContext(SpreadsheetContext);
  const { openSearchWindow } = useContext(SearchWindowContext);

  const { moveSelectionNextAvailable } = useSelectionMoveNextAvailable();
  const { moveSelectionToSheetStart, moveSelectionToSheetEnd } =
    useSelectionMoveToSheetStartOrEnd();

  const { createProjectAction } = useProjectActions();
  const { deleteSelectedFieldOrTable } = useManualEditDSL();

  const shortcutGlobalHandlersMap: Partial<ShortcutHandlersMap> = useMemo(
    () => ({
      [Shortcut.NewProject]: () => createProjectAction(),
      [Shortcut.ToggleProjects]: () => togglePanel(PanelName.ProjectTree),
      [Shortcut.ToggleCodeEditor]: () => togglePanel(PanelName.CodeEditor),
      [Shortcut.ToggleInputs]: () => togglePanel(PanelName.Inputs),
      [Shortcut.ToggleErrors]: () => togglePanel(PanelName.Errors),
      [Shortcut.ToggleHistory]: () => togglePanel(PanelName.UndoRedo),
      [Shortcut.ToggleChat]: () => togglePanel(PanelName.Chat),
      [Shortcut.RedoAction]: () => redo(),
      [Shortcut.UndoAction]: () => undo(),
      [Shortcut.Delete]: () => deleteSelectedFieldOrTable(),
      [Shortcut.ZoomIn]: () => updateZoomWithWheel(1),
      [Shortcut.ZoomOut]: () => updateZoomWithWheel(-1),
      [Shortcut.ZoomReset]: () => updateZoom(1),
      [Shortcut.SearchWindow]: () => openSearchWindow(),
      [Shortcut.MoveSelectionNextAvailableUp]: () =>
        moveSelectionNextAvailable('up'),
      [Shortcut.MoveSelectionNextAvailableDown]: () =>
        moveSelectionNextAvailable('down'),
      [Shortcut.MoveSelectionNextAvailableLeft]: () =>
        moveSelectionNextAvailable('left'),
      [Shortcut.MoveSelectionNextAvailableRight]: () =>
        moveSelectionNextAvailable('right'),
      [Shortcut.MoveToSheetStart]: () => moveSelectionToSheetStart(),
      [Shortcut.MoveToSheetEnd]: () => moveSelectionToSheetEnd(),
    }),
    [
      createProjectAction,
      togglePanel,
      redo,
      undo,
      deleteSelectedFieldOrTable,
      updateZoomWithWheel,
      updateZoom,
      openSearchWindow,
      moveSelectionNextAvailable,
      moveSelectionToSheetStart,
      moveSelectionToSheetEnd,
    ]
  );

  const handleEvent = useCallback(
    (event: KeyboardEvent) => {
      for (const shortcut of disabledShortcutsOnCellEditorOpen) {
        const validShortcut = shortcutApi.is(shortcut as Shortcut, event);

        if (validShortcut && gridApi?.isCellEditorOpen()) return;
      }

      for (const shortcutKey in shortcutGlobalHandlersMap) {
        if (shortcutApi.is(shortcutKey as Shortcut, event)) {
          shortcutGlobalHandlersMap[shortcutKey as Shortcut]?.(event);

          // Don't prevent default for Delete shortcut
          if (shortcutKey !== Shortcut.Delete) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }

          break;
        }
      }
    },
    [gridApi, shortcutGlobalHandlersMap]
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
