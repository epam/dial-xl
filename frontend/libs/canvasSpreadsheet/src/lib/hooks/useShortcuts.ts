import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import {
  KeyboardCode,
  Shortcut,
  shortcutApi,
  ShortcutHandlersMap,
} from '@frontend/common';

import { GridStateContext } from '../context';
import { GridEvent, HorizontalDirection } from '../types';
import { isCanvasEvent, isCellEditorOpen } from '../utils';
import { useAIPrompt } from './useAIPrompt';
import { useClipboardTarget } from './useClipboardTarget';
import { useCopyPaste } from './useCopyPaste';
import { useExtendSelectionNextAvailable } from './useExtendSelectionNextAvailable';
import { useNavigation } from './useNavigation';
import { useSelection } from './useSelection';
import { useSelectionMoveNextAvailable } from './useSelectionMoveNextAvailable';

const singleKeyShortcuts = [
  KeyboardCode.Home,
  KeyboardCode.End,
  KeyboardCode.Enter,
  KeyboardCode.Escape,
  KeyboardCode.Tab,
  KeyboardCode.PageUp,
  KeyboardCode.PageDown,
  KeyboardCode.ArrowDown,
  KeyboardCode.ArrowUp,
  KeyboardCode.ArrowLeft,
  KeyboardCode.ArrowRight,
];

// Keys that behave like navigation when held (Arrow + Enter/Tab)
const keysToHold = [
  KeyboardCode.ArrowDown,
  KeyboardCode.ArrowUp,
  KeyboardCode.ArrowLeft,
  KeyboardCode.ArrowRight,
  KeyboardCode.Enter,
  KeyboardCode.Tab,
];

const holdKeys = new Set<KeyboardCode>(keysToHold);

const isHoldKey = (k: string): k is KeyboardCode =>
  holdKeys.has(k as KeyboardCode);

// Map physical key to a logical arrow direction
const toArrowDir = (e: KeyboardEvent): KeyboardCode | null => {
  const k = e.key as KeyboardCode;
  if (k === KeyboardCode.Enter) return KeyboardCode.ArrowDown;
  if (k === KeyboardCode.Tab) return KeyboardCode.ArrowRight;
  if (
    k === KeyboardCode.ArrowUp ||
    k === KeyboardCode.ArrowDown ||
    k === KeyboardCode.ArrowLeft ||
    k === KeyboardCode.ArrowRight
  )
    return k;

  return null;
};

// Frame pacing for repeats
const stepIntervalMs = 16; // repeat cadence while holding (~60fps)
const initialRepeatDelayMs = 140; // delay before the second step (prevents double tap feel)

export function useShortcuts() {
  const {
    event,
    eventBus,
    selectedTable,
    isPanModeEnabled,
    getCell,
    selectionEdges,
    canvasOptions,
  } = useContext(GridStateContext);
  const {
    arrowNavigation,
    extendSelection,
    scrollPage,
    moveSelectionToEdge,
    tabNavigation,
  } = useNavigation();
  const { openAIPrompt } = useAIPrompt();
  const { copy, paste } = useCopyPaste();
  const { selectRow, selectColumn, stopMoveTable, completeMoveTable } =
    useSelection();
  const { moveSelectionNextAvailable } = useSelectionMoveNextAvailable();
  const { extendSelectionNextAvailable } = useExtendSelectionNextAvailable();

  // Hold state refs
  const heldDirRef = useRef<KeyboardCode | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const nextAllowedTsRef = useRef<number>(0);
  const stepRef = useRef<((ts: number) => void) | undefined>(undefined);

  const handleSwapFields = useCallback(
    (e: KeyboardEvent, direction: HorizontalDirection) => {
      if (!isCanvasEvent(e, canvasOptions)) return;
      if (!selectionEdges) return;

      const { startCol, startRow } = selectionEdges;
      const cell = getCell(startCol, startRow);
      if (!cell || !cell.table || !cell.field) return;

      eventBus.emit({
        type: 'fields/swap',
        payload: {
          tableName: cell.table.tableName,
          fieldName: cell.field.fieldName,
          direction,
        },
      });
    },
    [canvasOptions, selectionEdges, getCell, eventBus],
  );

  const handleSelectTable = useCallback(
    (e: KeyboardEvent) => {
      if (!isCanvasEvent(e, canvasOptions)) return;

      e.preventDefault();

      event.emit({
        type: GridEvent.selectAll,
        selectFromCurrentCell: true,
      });
    },
    [canvasOptions, event],
  );

  const handleOpenNote = useCallback(() => {
    if (!selectionEdges) return;

    const { startCol, startRow } = selectionEdges;

    event.emit({
      type: GridEvent.openNote,
      col: startCol,
      row: startRow,
    });
  }, [event, selectionEdges]);

  const handleDelete = useCallback(
    (e: KeyboardEvent) => {
      if (!isCanvasEvent(e, canvasOptions)) return;

      eventBus.emit({
        type: 'selection/delete',
      });
    },
    [canvasOptions, eventBus],
  );

  // rAF loop: emits one navigation step when allowed, then schedules the next frame
  useEffect(() => {
    stepRef.current = (ts: number) => {
      const dir = heldDirRef.current;
      if (!dir) return;

      if (ts >= nextAllowedTsRef.current) {
        arrowNavigation(dir);
        nextAllowedTsRef.current = ts + stepIntervalMs;
      }

      rafIdRef.current = requestAnimationFrame(stepRef.current!);
    };
  }, [arrowNavigation]);

  const step = useCallback((ts: number) => stepRef.current?.(ts), []);

  // Stop holding any direction and cancel the rAF loop
  const stopHold = useCallback(() => {
    heldDirRef.current = null;
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  // Start holding a direction. Optional initialStep:
  // initialStep !== false -> perform the first step immediately (for Arrows)
  // initialStep === false -> do not perform the first step (Enter/Tab already did their single action)
  const startHold = useCallback(
    (dir: KeyboardCode, opts?: { initialStep?: boolean }) => {
      if (heldDirRef.current === dir) return;
      heldDirRef.current = dir;

      if (opts?.initialStep !== false) {
        arrowNavigation(dir);
      }

      nextAllowedTsRef.current = performance.now() + initialRepeatDelayMs;
      if (rafIdRef.current == null) {
        rafIdRef.current = requestAnimationFrame(step);
      }
    },
    [arrowNavigation, step],
  );

  // Unified handler for all holdable keys. Returns true if the event was fully handled.
  const handleHoldableKeyDown = useCallback(
    (e: KeyboardEvent): boolean => {
      const isHold = isHoldKey(e.key);
      if (!isHold) return false;
      if (!isCanvasEvent(e, canvasOptions)) return true;
      if (e.repeat) {
        e.preventDefault();
        e.stopPropagation();

        return true;
      }

      const dir = toArrowDir(e);
      if (!dir) return true;

      if (heldDirRef.current && heldDirRef.current !== dir) stopHold();

      e.preventDefault();
      e.stopPropagation();

      if (e.key === KeyboardCode.Enter) {
        if (selectedTable) {
          completeMoveTable();

          return true;
        }

        arrowNavigation(KeyboardCode.ArrowDown);
        startHold(dir, { initialStep: false });

        return true;
      }

      if (e.key === KeyboardCode.Tab) {
        tabNavigation();
        startHold(dir, { initialStep: false });

        return true;
      }

      startHold(dir, { initialStep: true });

      return true;
    },
    [
      canvasOptions,
      completeMoveTable,
      selectedTable,
      tabNavigation,
      arrowNavigation,
      startHold,
      stopHold,
    ],
  );

  const handleSingleKeyShortcuts = useCallback(
    (e: KeyboardEvent) => {
      const isValidSingleShortcut = singleKeyShortcuts.includes(
        e.key as KeyboardCode,
      );

      if (isValidSingleShortcut && !isCanvasEvent(e, canvasOptions)) {
        return;
      }

      if (isHoldKey(e.key)) return;

      switch (e.key) {
        case KeyboardCode.Space:
          if (!isCellEditorOpen() && isCanvasEvent(e, canvasOptions)) {
            e.preventDefault();
            e.stopPropagation();
            openAIPrompt();

            return;
          }
          break;
        case KeyboardCode.Home:
          moveSelectionToEdge('left');
          break;
        case KeyboardCode.End:
          moveSelectionToEdge('right');
          break;

        case KeyboardCode.Escape:
          if (selectedTable) {
            stopMoveTable();
          }
          break;

        case KeyboardCode.PageUp:
          scrollPage('up');
          break;
        case KeyboardCode.PageDown:
          scrollPage('down');
          break;
      }
    },
    [
      canvasOptions,
      moveSelectionToEdge,
      selectedTable,
      scrollPage,
      openAIPrompt,
      stopMoveTable,
    ],
  );

  const shortcutGlobalHandlersMap: Partial<ShortcutHandlersMap> = useMemo(
    () => ({
      [Shortcut.SwapFieldsRight]: (e) => handleSwapFields(e, 'right'),
      [Shortcut.SwapFieldsLeft]: (e) => handleSwapFields(e, 'left'),
      [Shortcut.AddNote]: () => handleOpenNote(),
      [Shortcut.Delete]: (e) => handleDelete(e),
      [Shortcut.Backspace]: (e) => handleDelete(e),
      [Shortcut.MoveToSheetStart]: () => moveSelectionToEdge('up'),
      [Shortcut.MoveToSheetEnd]: () => moveSelectionToEdge('down'),
      [Shortcut.SelectAll]: (e) =>
        canvasOptions.enableMoveTable && handleSelectTable(e),
      [Shortcut.SelectRow]: () => selectRow(),
      [Shortcut.SelectColumn]: () => selectColumn(),
      [Shortcut.ExtendRangeSelectionUp]: () =>
        extendSelectionNextAvailable('up'),
      [Shortcut.ExtendRangeSelectionDown]: () =>
        extendSelectionNextAvailable('down'),
      [Shortcut.ExtendRangeSelectionLeft]: () =>
        extendSelectionNextAvailable('left'),
      [Shortcut.ExtendRangeSelectionRight]: () =>
        extendSelectionNextAvailable('right'),
      [Shortcut.RangeSelectionUp]: () => extendSelection('up'),
      [Shortcut.RangeSelectionDown]: () => extendSelection('down'),
      [Shortcut.RangeSelectionLeft]: () => extendSelection('left'),
      [Shortcut.RangeSelectionRight]: () => extendSelection('right'),
      [Shortcut.MoveSelectionNextAvailableUp]: (e) => {
        e.preventDefault();
        moveSelectionNextAvailable('up');
      },
      [Shortcut.MoveSelectionNextAvailableDown]: (e) => {
        e.preventDefault();
        moveSelectionNextAvailable('down');
      },
      [Shortcut.MoveSelectionNextAvailableLeft]: (e) => {
        e.preventDefault();
        moveSelectionNextAvailable('left');
      },
      [Shortcut.MoveSelectionNextAvailableRight]: (e) => {
        e.preventDefault();
        moveSelectionNextAvailable('right');
      },
    }),
    [
      canvasOptions,
      extendSelection,
      extendSelectionNextAvailable,
      handleDelete,
      handleOpenNote,
      handleSelectTable,
      handleSwapFields,
      moveSelectionNextAvailable,
      moveSelectionToEdge,
      selectColumn,
      selectRow,
    ],
  );

  const onPaste = useMemo(
    () => (e: ClipboardEvent) => paste(eventBus, e),
    [eventBus, paste],
  );

  const { focusClipboardBridge } = useClipboardTarget(onPaste);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (isPanModeEnabled) return;

      const canvasEvent = isCanvasEvent(event, canvasOptions);

      if (!canvasEvent && heldDirRef.current) {
        stopHold();
      }

      if (canvasEvent && shortcutApi.is(Shortcut.Copy, event)) {
        event.preventDefault();
        focusClipboardBridge();
        copy();

        return;
      }

      if (canvasEvent && shortcutApi.is(Shortcut.Paste, event)) {
        focusClipboardBridge();

        return;
      }

      for (const shortcutKey in shortcutGlobalHandlersMap) {
        if (shortcutApi.is(shortcutKey as Shortcut, event)) {
          if (!isCanvasEvent(event, canvasOptions)) return;
          shortcutGlobalHandlersMap[shortcutKey as Shortcut]?.(event);

          return;
        }
      }

      if (handleHoldableKeyDown(event)) return;

      handleSingleKeyShortcuts(event);
    },
    [
      isPanModeEnabled,
      canvasOptions,
      handleHoldableKeyDown,
      handleSingleKeyShortcuts,
      stopHold,
      focusClipboardBridge,
      copy,
      shortcutGlobalHandlersMap,
    ],
  );

  // Keyup stops the hold for any holdable key (Arrows/Enter/Tab)
  const onKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (isHoldKey(e.key)) {
        stopHold();
      }
    },
    [stopHold],
  );

  // Any non-holdable keydown cancels holding (safety net)
  const onAnyNonArrowKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isHoldKey(e.key) && heldDirRef.current) {
        stopHold();
      }
    },
    [stopHold],
  );

  useEffect(() => {
    const onBlur = () => stopHold();
    const onHide = () => stopHold();
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onHide);

    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [stopHold]);

  useEffect(() => {
    const onBlur = () => stopHold();
    const onHide = () => {
      if (document.hidden) stopHold();
    };
    const onPointer = () => stopHold();

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    document.addEventListener('keydown', onAnyNonArrowKeyDown, true);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onHide);
    document.addEventListener('pointerdown', onPointer, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('keyup', onKeyUp, true);
      document.removeEventListener('keydown', onAnyNonArrowKeyDown, true);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onHide);
      document.removeEventListener('pointerdown', onPointer, true);
    };
  }, [onKeyUp, onAnyNonArrowKeyDown, stopHold, onKeyDown]);
}
