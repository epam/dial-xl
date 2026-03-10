import { useCallback, useContext, useRef } from 'react';

import { isFormulaBarMonacoInputFocused, isModalOpen } from '@frontend/common';

import { GridStateContext } from '../../../context';
import { useNavigation } from '../../../hooks';
import { GridEventBus, isCellEditorOpen } from '../../../utils';
import { CellEditorContext } from '../CellEditorContext';
import { SelectionEffectAfterSave } from '../types';
import { isCellEditorHasFocus } from '../utils';

type Props = {
  eventBus: GridEventBus;
  isPointClickMode: boolean;
};

export function useCellEditorCompleteEdit({
  eventBus,
  isPointClickMode,
}: Props) {
  const { getCell } = useContext(GridStateContext);
  const { arrowNavigation, tabNavigation } = useNavigation();
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
    async (value: string) => {
      if (!currentCell) return;

      skipSaveOnBlur.current = true;
      const { col, row } = currentCell;
      const cell = getCell(col, row);

      const requiredHide = await new Promise<boolean>((resolve) => {
        eventBus.emit({
          type: 'editor/submit',
          payload: { editMode, currentCell, cell, value, dimFieldName },
          reply: resolve,
        });
      });

      if (requiredHide) {
        hide();
      }
    },
    [currentCell, dimFieldName, editMode, eventBus, getCell, hide],
  );

  const onEscape = useCallback(() => {
    skipSaveOnBlur.current = true;

    if (ignoreScrollEvent.current) {
      ignoreScrollEvent.current = false;

      return;
    }

    if (openedExplicitly && !isCellEditorHasFocus()) return;

    eventBus.emit({
      type: 'editor/value-updated',
      payload: {
        value: codeValue.current,
        cancelEdit: true,
      },
    });

    hide();
  }, [
    codeValue,
    eventBus,
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
      if (isCellEditorOpen()) return;

      switch (moveSelection) {
        case 'arrow-right':
          arrowNavigation('ArrowRight');
          break;
        case 'arrow-left':
          arrowNavigation('ArrowLeft');
          break;
        case 'arrow-top':
          arrowNavigation('ArrowUp');
          break;
        case 'arrow-bottom':
        case 'enter':
          arrowNavigation('ArrowDown');
          break;
        case 'tab':
          tabNavigation();
          break;
      }
    },
    [arrowNavigation, tabNavigation],
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
    [codeValue, moveSelectionAfterSave, save],
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
