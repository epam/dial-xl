import { Dropdown } from 'antd';
import { MenuInfo } from 'rc-menu/lib/interface';
import {
  MouseEvent,
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  KeyboardCode,
  MenuItem,
  Shortcut,
  shortcutApi,
  useClickOutside,
} from '@frontend/common';

import {
  contextMenuButtonClass,
  gridDataContainerClass,
} from '../../constants';
import { Grid } from '../../grid';
import { GridService } from '../../services';
import { GridCallbacks } from '../../types';
import { focusSpreadsheet, getDataScroller, getGridRoot } from '../../utils';
import {
  getTableCellMenuItems,
  getTableFieldMenuItems,
  getTableHeaderMenuItems,
} from './contextMenuUtils';
import { useOnClickContextMenu } from './useOnClickContextMenu';

export type HandleContextMenuFunctionRef = (
  e: MouseEvent<HTMLDivElement>
) => void;

type Props = {
  handleContextMenu: { current: HandleContextMenuFunctionRef | null };
  gridServiceRef: MutableRefObject<GridService | null>;
  gridCallbacksRef: MutableRefObject<GridCallbacks>;
  api: Grid | null;
};

export function ContextMenu({
  handleContextMenu,
  gridServiceRef,
  gridCallbacksRef,
  api,
}: Props) {
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [contextMenuItems, setContextMenuItems] = useState<MenuItem[]>([]);
  const clickRef = useRef<HTMLDivElement>(null);
  const { onClickContextMenu } = useOnClickContextMenu({
    gridCallbacksRef,
    gridServiceRef,
    api,
  });

  const onClickOutside = useCallback(() => {
    setContextMenuOpen(false);
  }, []);

  useClickOutside(clickRef, onClickOutside);

  const openContextMenu = useCallback(
    (x: number, y: number, col: number, row: number) => {
      const cell = gridServiceRef.current?.getCellValue(+row, +col);

      if (!cell?.table) return;

      setTimeout(() => {
        setContextMenuOpen(true);
        setContextMenuPos({ x, y });

        if (!cell.table) return;

        const { table, row, col } = cell;
        const { startCol, endCol, startRow } = table;

        if (row === startRow && col >= startCol && col <= endCol) {
          const isChart = !!cell.table.chartType;
          setContextMenuItems(
            getTableHeaderMenuItems(startCol, startRow, isChart)
          );
        } else if (
          row - 1 === startRow &&
          col >= startCol &&
          col <= endCol &&
          cell.field
        ) {
          const { isManual } = cell;
          const { isKey, isDim, isDynamic } = cell.field;
          setContextMenuItems(
            getTableFieldMenuItems(col, row, isKey, isDim, isDynamic, isManual)
          );
        } else {
          const { isOverride } = cell;
          setContextMenuItems(getTableCellMenuItems(col, row, !!isOverride));
        }
      });
    },
    [gridServiceRef]
  );

  const onContextMenu = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      e.preventDefault();

      if (!api) return;

      const { top, left } = e.currentTarget.getBoundingClientRect();

      const { col, row } = api.getCellDimensions(e.target as HTMLElement);

      if (col === -1 || row === -1) return;

      openContextMenu(e.clientX - left, e.clientY - top, +col, +row);
    },
    [api, openContextMenu]
  );

  const onTableHeaderContextMenu = useCallback(
    (e: MouseEvent, target: HTMLElement) => {
      e.preventDefault();

      const root = getGridRoot();

      if (!root || !api) return;

      const { top, left } = root.getBoundingClientRect();

      const { col, row } = api.getCellDimensions(target);

      if (col === -1 || row === -1) return;

      openContextMenu(e.clientX - left, e.clientY - top, +col, +row);
    },
    [api, openContextMenu]
  );

  const onClick = useCallback(
    (info: MenuInfo) => {
      setContextMenuOpen(false);

      // Timeout to hide context menu and focus spreadsheet first
      // and avoid blur event to close just opened cell editor
      setTimeout(() => {
        onClickContextMenu(info);
      }, 0);
    },
    [onClickContextMenu]
  );

  const openContextMenuByKey = useCallback(
    (event: KeyboardEvent) => {
      if (
        contextMenuOpen &&
        (event.key === KeyboardCode.ArrowUp ||
          event.key === KeyboardCode.ArrowDown)
      ) {
        return;
      }

      if (!shortcutApi.is(Shortcut.ContextMenu, event)) {
        setContextMenuOpen(false);

        return;
      }

      event.preventDefault();

      if (!api) return;

      const selection = api.selection$.getValue();

      if (!selection || selection.startCol !== selection.endCol) return;

      const { startRow, startCol } = selection;

      const gridDataScroller = getDataScroller();

      if (!gridDataScroller) return;

      const cell = gridDataScroller.querySelector(
        `[data-row="${startRow}"][data-col="${startCol}"]`
      );

      const root = getGridRoot();

      if (!cell || !root) return;

      const { x, y, height, width } = cell.getBoundingClientRect();

      const { top, left } = root.getBoundingClientRect();

      openContextMenu(
        x + width / 2 - left,
        y + height / 2 - top,
        startCol,
        startRow
      );
    },
    [api, contextMenuOpen, openContextMenu]
  );

  const onMouseDown = useCallback(
    (event: any) => {
      const dataContainer = document.querySelector(
        `.${gridDataContainerClass}`
      );

      if (!dataContainer) return;

      let target = event.target;

      while (target && target !== dataContainer) {
        if (target.nodeName === 'BUTTON') {
          if (target.classList.contains(contextMenuButtonClass)) {
            onTableHeaderContextMenu(event, target);
          }

          return;
        }
        target = target.parentNode;
      }
    },
    [onTableHeaderContextMenu]
  );

  useEffect(() => {
    document.addEventListener('keyup', openContextMenuByKey);

    const dataContainer = document.querySelector(`.${gridDataContainerClass}`);
    dataContainer?.addEventListener('click', onMouseDown);

    return () => {
      document.removeEventListener('keyup', openContextMenuByKey);
      dataContainer?.removeEventListener('click', onMouseDown);
    };
  }, [onMouseDown, openContextMenuByKey]);

  useEffect(() => {
    handleContextMenu.current = onContextMenu;
  }, [handleContextMenu, onContextMenu]);

  useEffect(() => {
    if (!contextMenuOpen) {
      // Prevent unpredictable behavior, we should return focus to the spreadsheet
      focusSpreadsheet();
    }
  }, [contextMenuOpen]);

  return (
    <Dropdown
      autoAdjustOverflow={true}
      autoFocus={true}
      destroyPopupOnHide={true}
      forceRender={true}
      menu={{ items: contextMenuItems, onClick }}
      open={contextMenuOpen}
      rootClassName="grid-context-menu"
    >
      <div
        id="area"
        ref={clickRef}
        style={{
          position: 'absolute',
          top: `${contextMenuPos.y}px`,
          left: `${contextMenuPos.x}px`,
        }}
      />
    </Dropdown>
  );
}
