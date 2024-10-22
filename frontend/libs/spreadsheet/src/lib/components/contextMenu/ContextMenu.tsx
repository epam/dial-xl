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
  FilesMetadata,
  FunctionInfo,
  getDataScroller,
  KeyboardCode,
  MenuItem,
  Shortcut,
  shortcutApi,
  useClickOutside,
} from '@frontend/common';
import { ParsedSheets } from '@frontend/parser';

import {
  applyMenuButtonClass,
  contextMenuButtonClass,
  gridDataContainerClass,
} from '../../constants';
import { defaults } from '../../defaults';
import { Grid } from '../../grid';
import { GridService } from '../../services';
import { GridCallbacks } from '../../types';
import {
  focusSpreadsheet,
  getCellContext,
  getCellElementDimensions,
  getGridRoot,
} from '../../utils';
import {
  findTargetButtonByClass,
  getEmptyCellMenuItems,
  getEmptyCellWithoutContextMenuItem,
  getTableCellMenuItems,
  getTableFieldMenuItems,
  getTableHeaderMenuItems,
  onContextMenuButton,
  OpenContextMenuParams,
  useOnClickContextMenu,
} from './utils';

export type HandleContextMenuFunctionRef = (
  e: MouseEvent<HTMLDivElement>
) => void;

type Props = {
  handleContextMenu: { current: HandleContextMenuFunctionRef | null };
  gridServiceRef: MutableRefObject<GridService | null>;
  gridCallbacksRef: MutableRefObject<GridCallbacks>;
  functions: FunctionInfo[];
  parsedSheets: ParsedSheets;
  inputFiles: FilesMetadata[] | null;
  api: Grid | null;
};

export function ContextMenu({
  handleContextMenu,
  gridServiceRef,
  gridCallbacksRef,
  api,
  functions,
  parsedSheets,
  inputFiles,
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

  const handleCreateTableBySize = useCallback(
    (cols: number, rows: number) => {
      const colsItems = new Array(cols).fill('');
      const rowsItems = new Array(rows).fill(colsItems);

      gridCallbacksRef.current.onCreateManualTable?.(
        api?.selection?.startCol ?? 1,
        api?.selection?.startRow ?? 1,
        rowsItems
      );
    },
    [api, gridCallbacksRef]
  );

  useClickOutside(clickRef, onClickOutside);

  const openContextMenu = useCallback(
    (params: OpenContextMenuParams | null) => {
      if (!params || !api) return;

      const { x, y, col, row } = params;
      const cell = gridServiceRef.current?.getCellValue(+row, +col);

      setTimeout(() => {
        setContextMenuOpen(true);
        setContextMenuPos({ x, y });

        if (!cell?.table) {
          const contextCell = getCellContext(api, col, row);

          if (!contextCell?.table) {
            setContextMenuItems(
              getEmptyCellWithoutContextMenuItem(
                functions,
                parsedSheets,
                inputFiles,
                handleCreateTableBySize,
                col,
                row
              )
            );
          } else {
            setContextMenuItems(getEmptyCellMenuItems(col, row, contextCell));
          }

          return;
        }

        if (cell.isTableHeader) {
          setContextMenuItems(getTableHeaderMenuItems(cell));
        } else if (cell.isFieldHeader && cell.field) {
          setContextMenuItems(
            getTableFieldMenuItems(col, row, cell, gridCallbacksRef.current)
          );
        } else {
          setContextMenuItems(
            getTableCellMenuItems(col, row, cell, gridCallbacksRef.current)
          );
        }
      });
    },
    [
      api,
      gridServiceRef,
      functions,
      parsedSheets,
      inputFiles,
      handleCreateTableBySize,
      gridCallbacksRef,
    ]
  );

  const onContextMenu = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      e.preventDefault();

      if (!api) return;

      const { top, left } = e.currentTarget.getBoundingClientRect();

      const { col, row } = getCellElementDimensions(e.target as HTMLElement);

      if (col === -1 || row === -1) return;

      openContextMenu({
        x: e.clientX - left,
        y: e.clientY - top,
        col: +col,
        row: +row,
      });
    },
    [api, openContextMenu]
  );

  const onClick = useCallback(
    (info: MenuInfo) => {
      const { action } = JSON.parse(info.key);

      if (action.startsWith('NumFilter') || action.startsWith('TextFilter')) {
        return;
      }

      setContextMenuOpen(false);

      // Timeout to hide context menu and focus spreadsheet first
      // and avoid blur event to close just opened cell editor
      setTimeout(() => {
        onClickContextMenu(info);
      }, 0);
    },
    [onClickContextMenu]
  );

  const onKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (contextMenuOpen && event.key === KeyboardCode.Escape) {
        setContextMenuOpen(false);

        return;
      }

      if (contextMenuOpen) return;

      if (!shortcutApi.is(Shortcut.ContextMenu, event)) {
        setContextMenuOpen(false);

        return;
      }

      event.preventDefault();

      if (!api) return;

      const gridDataScroller = getDataScroller();
      const root = getGridRoot();
      const selection = api.selection$.getValue();

      if (!selection || !gridDataScroller || !root) return;

      const { startRow, startCol, endCol } = selection;

      let cell = null;

      for (let col = startCol; col <= endCol; col++) {
        cell = gridDataScroller.querySelector(
          `[data-row="${startRow}"][data-col="${col}"]`
        );

        if (cell) {
          break;
        }
      }

      if (!cell) return;

      const { x, y, height } = cell.getBoundingClientRect();

      const { top, left } = root.getBoundingClientRect();

      openContextMenu({
        x:
          x - left >= 0
            ? x + defaults.cell.width / 2 - left
            : defaults.cell.width,
        y: y + height / 2 - top,
        col: startCol,
        row: startRow,
      });
    },
    [api, contextMenuOpen, openContextMenu]
  );

  const onMouseDown = useCallback(
    (event: any) => {
      const target = findTargetButtonByClass(event, [
        contextMenuButtonClass,
        applyMenuButtonClass,
      ]);

      if (!target) return;

      openContextMenu(onContextMenuButton(event, target));
    },
    [openContextMenu]
  );

  useEffect(() => {
    document.addEventListener('keyup', onKeyUp);

    const dataContainer = document.querySelector(`.${gridDataContainerClass}`);
    dataContainer?.addEventListener('click', onMouseDown);

    return () => {
      document.removeEventListener('keyup', onKeyUp);
      dataContainer?.removeEventListener('click', onMouseDown);
    };
  }, [onMouseDown, onKeyUp]);

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
