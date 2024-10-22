import { MutableRefObject, useCallback, useEffect } from 'react';

import { isContextMenuOpen } from '@frontend/common';

import { applyMenuButtonClass, tableHeaderClass } from '../constants';
import { Grid } from '../grid';
import { getActualCell, getApplyButtonId, getTableHeaderId } from '../utils';

const contextMenuCloseTimeout = 300;

export function useHoverEvents(apiRef: MutableRefObject<Grid | null>) {
  /**
   * Show apply button on hover of any field cell
   * Show close and context menu buttons on table header hover
   */
  const onMouseMove = useCallback(
    (event: MouseEvent) => {
      const api = apiRef.current;

      if (!api || isContextMenuOpen()) return;

      const actualCell = getActualCell(api, event);

      if (!actualCell) return;

      const target = event.target as HTMLElement;
      const containsTableHeaderClass =
        target.classList.contains(tableHeaderClass);
      const gridCell = api.getCell(actualCell.col, actualCell.row);
      const applyMenuButtons = document.querySelectorAll(
        `.${applyMenuButtonClass}`
      );

      applyMenuButtons.forEach((button) => {
        button.classList.remove('hover');
      });

      const tableHeaders = document.querySelectorAll(`.${tableHeaderClass}`);

      tableHeaders.forEach((header) => {
        header.classList.remove('hover');
      });

      if (!gridCell) return;

      if (gridCell.isTableHeader || containsTableHeaderClass) {
        const tableHeader = getTableHeaderId(gridCell);
        const headerElement = document.getElementById(tableHeader);

        if (headerElement) {
          headerElement.classList.add('hover');
        } else if (containsTableHeaderClass) {
          target.classList.add('hover');
        }
      }

      const applyButtonElement = document.getElementById(
        getApplyButtonId(gridCell)
      );

      if (!applyButtonElement) return;

      applyButtonElement.classList.add('hover');
    },
    [apiRef]
  );

  const onMouseDown = useCallback(
    (event: MouseEvent) => {
      setTimeout(() => {
        onMouseMove(event);
      }, contextMenuCloseTimeout);
    },
    [onMouseMove]
  );

  useEffect(() => {
    const api = apiRef.current;

    if (!api) return;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [apiRef, onMouseMove, onMouseDown]);
}
