import { RefObject, useCallback, useContext, useEffect, useMemo } from 'react';

import {
  KeyboardCode,
  Shortcut,
  shortcutApi,
  ShortcutHandlersMap,
} from '@frontend/common';

import { GridEvent } from '../components';
import { GridStateContext } from '../context';
import { GridApi, HorizontalDirection } from '../types';
import { isCanvasEvent, isCellEditorOpen } from '../utils';
import { useAIPrompt } from './useAIPrompt';
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

export function useShortcuts(gridApi: RefObject<GridApi>) {
  const { gridCallbacks, selection$, selectedTable, isPanModeEnabled } =
    useContext(GridStateContext);
  const {
    arrowNavigation,
    extendSelection,
    scrollPage,
    moveSelectionToEdge,
    tabNavigation,
  } = useNavigation();
  const { openAIPrompt } = useAIPrompt(gridApi.current);
  const { copy, paste } = useCopyPaste();
  const { selectRow, selectColumn, stopMoveTable, completeMoveTable } =
    useSelection();
  const { moveSelectionNextAvailable } = useSelectionMoveNextAvailable();
  const { extendSelectionNextAvailable } = useExtendSelectionNextAvailable();

  const handleSwapFields = useCallback(
    (e: KeyboardEvent, direction: HorizontalDirection) => {
      if (!gridApi?.current || !gridCallbacks || !isCanvasEvent(e)) return;
      const selection = selection$.getValue();
      if (!selection) return;

      const { startCol, startRow } = selection;
      const cell = gridApi.current.getCell(startCol, startRow);
      if (!cell || !cell.table || !cell.field) return;

      gridCallbacks.onSwapFields?.(
        cell.table.tableName,
        cell.field.fieldName,
        direction
      );
    },
    [gridApi, gridCallbacks, selection$]
  );

  const handleCopy = useCallback(
    (e: KeyboardEvent) => {
      if (!gridApi?.current || !gridCallbacks || !isCanvasEvent(e)) return;

      copy(gridApi.current);
    },
    [copy, gridApi, gridCallbacks]
  );

  const handlePaste = useCallback(
    (e: KeyboardEvent) => {
      if (!gridApi?.current || !gridCallbacks || !isCanvasEvent(e)) return;

      paste(gridApi.current, gridCallbacks);
    },
    [gridApi, gridCallbacks, paste]
  );

  const handleSelectTable = useCallback(
    (e: KeyboardEvent) => {
      if (!gridApi?.current || !isCanvasEvent(e)) return;

      e.preventDefault();

      gridApi.current.event.emit({
        type: GridEvent.selectAll,
        selectFromCurrentCell: true,
      });
    },
    [gridApi]
  );

  const handleOpenNote = useCallback(() => {
    const selectionEdges = selection$.getValue();

    if (!gridApi?.current || !selectionEdges) return;

    const { startCol, startRow } = selectionEdges;

    gridApi.current.event.emit({
      type: GridEvent.openNote,
      col: startCol,
      row: startRow,
    });
  }, [gridApi, selection$]);

  const handleDelete = useCallback(
    (e: KeyboardEvent) => {
      if (!isCanvasEvent(e)) return;

      gridCallbacks.onDelete?.();
    },
    [gridCallbacks]
  );

  const handleSingleKeyShortcuts = useCallback(
    (e: KeyboardEvent) => {
      const isValidSingleShortcut = singleKeyShortcuts.includes(
        e.key as KeyboardCode
      );

      if (isValidSingleShortcut && !isCanvasEvent(e)) {
        return;
      }

      switch (e.key) {
        case KeyboardCode.Space:
          if (!isCellEditorOpen() && isCanvasEvent(e)) {
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
        case KeyboardCode.Enter:
          if (selectedTable) {
            completeMoveTable();
          } else {
            arrowNavigation(KeyboardCode.ArrowDown);
          }
          break;
        case KeyboardCode.Escape:
          if (selectedTable) {
            stopMoveTable();
          }
          break;
        case KeyboardCode.Tab:
          e.preventDefault();
          e.stopPropagation();
          tabNavigation();
          break;
        case KeyboardCode.PageUp:
          scrollPage('up');
          break;
        case KeyboardCode.PageDown:
          scrollPage('down');
          break;
        case KeyboardCode.ArrowDown:
        case KeyboardCode.ArrowUp:
        case KeyboardCode.ArrowLeft:
        case KeyboardCode.ArrowRight:
          arrowNavigation(e.key as KeyboardCode);
          break;
      }
    },
    [
      moveSelectionToEdge,
      selectedTable,
      tabNavigation,
      scrollPage,
      arrowNavigation,
      openAIPrompt,
      completeMoveTable,
      stopMoveTable,
    ]
  );

  const shortcutGlobalHandlersMap: Partial<ShortcutHandlersMap> = useMemo(
    () => ({
      [Shortcut.SwapFieldsRight]: (e) => handleSwapFields(e, 'right'),
      [Shortcut.SwapFieldsLeft]: (e) => handleSwapFields(e, 'left'),
      [Shortcut.Copy]: (e) => handleCopy(e),
      [Shortcut.Paste]: (e) => handlePaste(e),
      [Shortcut.AddNote]: () => handleOpenNote(),
      [Shortcut.Delete]: (e) => handleDelete(e),
      [Shortcut.Backspace]: (e) => handleDelete(e),
      [Shortcut.MoveToSheetStart]: () => moveSelectionToEdge('up'),
      [Shortcut.MoveToSheetEnd]: () => moveSelectionToEdge('down'),
      [Shortcut.SelectAll]: (e) => handleSelectTable(e),
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
      extendSelection,
      extendSelectionNextAvailable,
      handleCopy,
      handleDelete,
      handleOpenNote,
      handlePaste,
      handleSelectTable,
      handleSwapFields,
      moveSelectionNextAvailable,
      moveSelectionToEdge,
      selectColumn,
      selectRow,
    ]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (isPanModeEnabled) return;

      for (const shortcutKey in shortcutGlobalHandlersMap) {
        if (shortcutApi.is(shortcutKey as Shortcut, event)) {
          if (!isCanvasEvent(event)) return;

          shortcutGlobalHandlersMap[shortcutKey as Shortcut]?.(event);

          return;
        }
      }

      handleSingleKeyShortcuts(event);
    },
    [handleSingleKeyShortcuts, shortcutGlobalHandlersMap, isPanModeEnabled]
  );

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onKeyDown]);
}
