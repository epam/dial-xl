import { RefObject, useCallback, useContext, useRef } from 'react';

import { isFormulaBarMonacoInputFocused, isModalOpen } from '@frontend/common';

import { GridApi, GridCallbacks } from '../../../types';
import { isCellEditorOpen } from '../../../utils';
import { CellEditorContext } from '../CellEditorContext';
import { SelectionEffectAfterSave } from '../types';
import { isCellEditorHasFocus } from '../utils';

type Props = {
  apiRef: RefObject<GridApi>;
  gridCallbacksRef: RefObject<GridCallbacks>;
  isPointClickMode: boolean;
};

export function useCellEditorCompleteEdit({
  apiRef,
  gridCallbacksRef,
  isPointClickMode,
}: Props) {
  const {
    codeValue,
    currentCell,
    dimFieldName,
    editMode,
    hide,
    ignoreScrollEvent,
    mouseOverSwitcherTooltip,
    openedExplicitly,
    openedWithNextChar,
    saveOnArrowEnabled,
  } = useContext(CellEditorContext);

  const skipSaveOnBlur = useRef<boolean>(false);

  const save = useCallback(
    (value: string) => {
      if (!apiRef.current || !gridCallbacksRef.current || !currentCell) return;

      skipSaveOnBlur.current = true;
      const { col, row } = currentCell;
      const cell = apiRef.current.getCell(col, row);

      const requiredHide = gridCallbacksRef.current.onCellEditorSubmit?.({
        editMode,
        currentCell,
        cell,
        value,
        dimFieldName,
      });

      if (requiredHide) {
        hide();
      }
    },
    [apiRef, currentCell, dimFieldName, editMode, gridCallbacksRef, hide]
  );

  const onEscape = useCallback(() => {
    skipSaveOnBlur.current = true;

    if (ignoreScrollEvent.current) {
      ignoreScrollEvent.current = false;

      return;
    }

    if (openedExplicitly && !isCellEditorHasFocus()) return;

    gridCallbacksRef?.current?.onCellEditorUpdateValue?.(
      codeValue.current,
      true
    );

    hide();
  }, [
    codeValue,
    gridCallbacksRef,
    hide,
    ignoreScrollEvent,
    openedExplicitly,
    skipSaveOnBlur,
  ]);

  const onBlur = useCallback(() => {
    if (isPointClickMode || mouseOverSwitcherTooltip.current) return;

    if (ignoreScrollEvent.current) {
      ignoreScrollEvent.current = false;

      return;
    }

    const currentCellValue = codeValue.current;

    // setTimeout because we need to wait for the focus on monaco editor
    setTimeout(() => {
      if (openedExplicitly || !document.hasFocus()) {
        return;
      }

      if (!isFormulaBarMonacoInputFocused() && !isModalOpen()) {
        if (!skipSaveOnBlur.current) {
          save(currentCellValue);
          skipSaveOnBlur.current = false;

          return;
        }

        hide();
      }

      skipSaveOnBlur.current = false;
    }, 0);
  }, [
    codeValue,
    hide,
    ignoreScrollEvent,
    isPointClickMode,
    mouseOverSwitcherTooltip,
    openedExplicitly,
    save,
    skipSaveOnBlur,
  ]);

  const moveSelectionAfterSave = useCallback(
    (moveSelection: SelectionEffectAfterSave) => {
      if (!apiRef.current || isCellEditorOpen()) return;

      const api = apiRef.current;

      switch (moveSelection) {
        case 'arrow-right':
          api.arrowNavigation('ArrowRight');
          break;
        case 'arrow-left':
          api.arrowNavigation('ArrowLeft');
          break;
        case 'arrow-top':
          api.arrowNavigation('ArrowUp');
          break;
        case 'arrow-bottom':
        case 'enter':
          api.arrowNavigation('ArrowDown');
          break;
        case 'tab':
          api.tabNavigation();
          break;
      }
    },
    [apiRef]
  );

  const onSave = useCallback(
    (moveSelection: SelectionEffectAfterSave) => {
      save(codeValue.current || '');

      // setTimeout because we need to wait for the cell editor to hide
      // and to have this side effect only in one place
      setTimeout(() => {
        moveSelectionAfterSave(moveSelection);
      }, 0);
    },
    [codeValue, moveSelectionAfterSave, save]
  );

  const onSaveCallback = useCallback(() => {
    onSave('enter');
  }, [onSave]);

  const onTabCallback = useCallback(() => {
    onSave('tab');
  }, [onSave]);

  const onRightArrowCallback = useCallback(() => {
    if (openedWithNextChar) {
      onSave('arrow-right');
    }
  }, [openedWithNextChar, onSave]);

  const onLeftArrowCallback = useCallback(() => {
    if (openedWithNextChar) {
      onSave('arrow-left');
    }
  }, [openedWithNextChar, onSave]);

  const onBottomArrowCallback = useCallback(() => {
    if (openedWithNextChar) {
      onSave('arrow-bottom');
    }
  }, [openedWithNextChar, onSave]);

  const onTopArrowCallback = useCallback(() => {
    if (openedWithNextChar) {
      onSave('arrow-top');
    }
  }, [openedWithNextChar, onSave]);

  const onCtrlEnterCallback = useCallback(() => {
    onSave('ctrl-enter');
  }, [onSave]);

  return {
    onBlur,
    onEscape,
    onCtrlEnterCallback,
    onSaveCallback,
    onTabCallback,
    onBottomArrowCallback: saveOnArrowEnabled
      ? onBottomArrowCallback
      : undefined,
    onLeftArrowCallback: saveOnArrowEnabled ? onLeftArrowCallback : undefined,
    onRightArrowCallback: saveOnArrowEnabled ? onRightArrowCallback : undefined,
    onTopArrowCallback: saveOnArrowEnabled ? onTopArrowCallback : undefined,
  };
}
