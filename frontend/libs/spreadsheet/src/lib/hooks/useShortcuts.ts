import { MutableRefObject, useCallback, useEffect, useMemo } from 'react';

import { Shortcut, shortcutApi, ShortcutHandlersMap } from '@frontend/common';

import { Grid } from '../grid';
import { GridService } from '../services';
import { GridCallbacks } from '../types';
import {
  isCellEditorOpen,
  isSpreadsheetTarget,
  scrollPage,
  swapFields,
} from '../utils';
import { useAIPrompt } from './useAIPrompt';
import { useCopyPaste } from './useCopyPaste';
import { useNotes } from './useNotes';
import { useSelectionMoveNextAvailable } from './useSelectionMoveNextAvailable';
import { useSelectionMoveToSheetStartOrEnd } from './useSelectionMoveToSheetStartOrEnd';

export function useShortcuts(
  apiRef: MutableRefObject<Grid | null>,
  gridServiceRef: MutableRefObject<GridService | null>,
  gridCallbacksRef: MutableRefObject<GridCallbacks>
) {
  const { addNote } = useNotes(apiRef, gridServiceRef);
  const { openAIPrompt } = useAIPrompt(apiRef.current);
  const { copy, paste } = useCopyPaste(
    apiRef,
    gridServiceRef,
    gridCallbacksRef
  );
  const { moveSelectionNextAvailable } = useSelectionMoveNextAvailable(
    apiRef,
    gridServiceRef
  );
  const { moveSelectionToSheetStartOrEnd } =
    useSelectionMoveToSheetStartOrEnd(apiRef);

  const handleSwapFields = useCallback(
    (direction: 'left' | 'right') => {
      swapFields(apiRef.current, gridServiceRef, gridCallbacksRef, direction);
    },
    [apiRef, gridCallbacksRef, gridServiceRef]
  );

  const shortcutGlobalHandlersMap: Partial<ShortcutHandlersMap> = useMemo(
    () => ({
      [Shortcut.SwapFieldsRight]: () => handleSwapFields('right'),
      [Shortcut.SwapFieldsLeft]: () => handleSwapFields('left'),
      [Shortcut.Copy]: () => copy(),
      [Shortcut.Paste]: () => paste(),
      [Shortcut.PageUp]: () => scrollPage('up'),
      [Shortcut.PageDown]: () => scrollPage('down'),
      [Shortcut.AddNote]: () => addNote(),

      [Shortcut.Delete]: () => gridCallbacksRef.current.onDelete?.(),
      [Shortcut.Backspace]: () => gridCallbacksRef.current.onDelete?.(),

      [Shortcut.MoveSelectionNextAvailableUp]: () =>
        moveSelectionNextAvailable('up'),
      [Shortcut.MoveSelectionNextAvailableDown]: () =>
        moveSelectionNextAvailable('down'),
      [Shortcut.MoveSelectionNextAvailableLeft]: () =>
        moveSelectionNextAvailable('left'),
      [Shortcut.MoveSelectionNextAvailableRight]: () =>
        moveSelectionNextAvailable('right'),
      [Shortcut.MoveToSheetStart]: () =>
        moveSelectionToSheetStartOrEnd('start'),
      [Shortcut.MoveToSheetEnd]: () => moveSelectionToSheetStartOrEnd('end'),
      [Shortcut.OpenAIPromptBox]: (e) => {
        if (!isCellEditorOpen()) {
          e.preventDefault();
          openAIPrompt();
        }
      },
    }),
    [
      handleSwapFields,
      copy,
      paste,
      addNote,
      gridCallbacksRef,
      moveSelectionNextAvailable,
      moveSelectionToSheetStartOrEnd,
      openAIPrompt,
    ]
  );

  const handleEvent = useCallback(
    (event: KeyboardEvent) => {
      if (!isSpreadsheetTarget(event)) return;

      for (const shortcutKey in shortcutGlobalHandlersMap) {
        if (shortcutApi.is(shortcutKey as Shortcut, event)) {
          shortcutGlobalHandlersMap[shortcutKey as Shortcut]?.(event);
          break;
        }
      }
    },
    [shortcutGlobalHandlersMap]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleEvent);

    return () => {
      document.removeEventListener('keydown', handleEvent);
    };
  }, [handleEvent]);
}
