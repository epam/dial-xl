import { useCallback, useContext, useEffect } from 'react';

import {
  formulaBarMenuClass,
  isFormulaBarMonacoInputFocused,
  isProjectTreeTarget,
} from '@frontend/common';
import {
  gridCellClass,
  gridDataContainerClass,
  gridRowDataContainerClass,
  isCellEditorHasFocus,
  isSpreadsheetCellFocused,
} from '@frontend/spreadsheet';

import { AppContext } from '../context';
import { useGridApi } from './useGridApi';

/*
 * When point and click mode is enabled, the blur events on cell-editor/formula-bar are disabled
 * but cell-editor/formula-bar should stop editing mode if the click is:
 *  1. not a spreadsheet cell
 *  2. not a project panel (the whole panel, because we should be able to expand tree nodes)
 *  3. cell-editor or formula-bar input
 *  4. dropdown for formulas list
 */
export function usePointClickClickWatcher() {
  const { isPointClickMode, switchPointClickMode } = useContext(AppContext);
  const gridApi = useGridApi();

  const handleDocumentClick = useCallback(
    (event: MouseEvent) => {
      if (!isPointClickMode || !event.target) return;

      const targetElement = event.target as HTMLElement;
      const isGridElement = [
        gridDataContainerClass,
        gridCellClass,
        gridRowDataContainerClass,
      ].some((className) => targetElement.classList.contains(className));
      const isDropdown =
        targetElement.classList.toString().includes('ant-dropdown') ||
        targetElement.parentElement?.classList
          .toString()
          .includes('ant-dropdown');
      const isFormulasMenuTriggerer = !!targetElement.closest(
        '.' + formulaBarMenuClass
      );

      if (
        isGridElement ||
        isSpreadsheetCellFocused(targetElement) ||
        isProjectTreeTarget(event) ||
        isCellEditorHasFocus() ||
        isFormulaBarMonacoInputFocused() ||
        isDropdown ||
        isFormulasMenuTriggerer ||
        targetElement.tagName === 'CANVAS'
      )
        return;

      event.stopPropagation();
      switchPointClickMode(false);
      gridApi?.hideCellEditor();
    },
    [gridApi, isPointClickMode, switchPointClickMode]
  );

  useEffect(() => {
    document.addEventListener('click', handleDocumentClick);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [handleDocumentClick]);
}
