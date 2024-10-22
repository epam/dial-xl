import { Dropdown } from 'antd';
import { MenuInfo } from 'rc-menu/lib/interface';
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Subscription } from 'rxjs';

import {
  FilesMetadata,
  FunctionInfo,
  KeyboardCode,
  MenuItem,
  Shortcut,
  shortcutApi,
  useClickOutside,
} from '@frontend/common';
import { ParsedSheets } from '@frontend/parser';
import { Application } from '@pixi/app';

import { GridApi, GridCallbacks } from '../../types';
import {
  filterByTypeAndCast,
  getCellContext,
  getMousePosition,
} from '../../utils';
import {
  getEmptyCellMenuItems,
  getEmptyCellWithoutContextMenuItem,
  getTableCellMenuItems,
  getTableFieldMenuItems,
  getTableHeaderMenuItems,
  GridContextMenuEventOpen,
  GridContextMenuEventType,
  OpenContextMenuParams,
  useOnClickContextMenu,
} from './utils';

type Props = {
  app: Application | null;
  apiRef: RefObject<GridApi>;
  gridCallbacksRef: RefObject<GridCallbacks>;
  functions: FunctionInfo[];
  parsedSheets: ParsedSheets;
  inputFiles: FilesMetadata[] | null;
};

export function ContextMenu({
  app,
  apiRef,
  gridCallbacksRef,
  functions,
  parsedSheets,
  inputFiles,
}: Props) {
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [contextMenuItems, setContextMenuItems] = useState<MenuItem[]>([]);
  const openedExplicitly = useRef(false);
  const clickRef = useRef<HTMLDivElement>(null);

  const api = useMemo(() => {
    return apiRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiRef.current]);

  const gridCallbacks = useMemo(() => {
    return gridCallbacksRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridCallbacksRef.current]);

  const { onClickContextMenu } = useOnClickContextMenu({ api, gridCallbacks });

  const onClickOutside = useCallback(() => {
    if (openedExplicitly.current) {
      openedExplicitly.current = false;

      return;
    }

    setContextMenuOpen(false);
  }, []);

  const handleCreateTableBySize = useCallback(
    (cols: number, rows: number) => {
      if (!gridCallbacks || !api) return;

      const colsItems = new Array(cols).fill('');
      const rowsItems = new Array(rows).fill(colsItems);
      const selectionEdges = api.getSelection();

      gridCallbacks.onCreateManualTable?.(
        selectionEdges?.startCol ?? 1,
        selectionEdges?.startRow ?? 1,
        rowsItems
      );
    },
    [gridCallbacks, api]
  );

  useClickOutside(clickRef, onClickOutside);

  const openContextMenu = useCallback(
    (params: OpenContextMenuParams | null) => {
      if (!params || !api) return;

      const { x, y, col, row } = params;
      const cellData = api.getCell(col, row);

      setTimeout(() => {
        setContextMenuOpen(true);
        setContextMenuPos({ x, y });

        if (!cellData?.table && api) {
          const contextCell = getCellContext(api.getCell, col, row);

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

        if (!cellData) return;

        if (cellData.isTableHeader) {
          setContextMenuItems(getTableHeaderMenuItems(cellData));
        } else if (cellData.isFieldHeader && cellData.field && gridCallbacks) {
          setContextMenuItems(
            getTableFieldMenuItems(col, row, cellData, gridCallbacks)
          );
        } else if (gridCallbacks) {
          setContextMenuItems(
            getTableCellMenuItems(col, row, cellData, gridCallbacks)
          );
        }
      });
    },
    [
      api,
      functions,
      parsedSheets,
      inputFiles,
      handleCreateTableBySize,
      gridCallbacks,
    ]
  );

  const onContextMenu = useCallback(
    (e: Event) => {
      e.preventDefault();

      const mousePosition = getMousePosition(e);

      if (!mousePosition || !api) return;

      const { x, y } = mousePosition;
      const cell = api.getCellFromCoords(x, y);

      if (!cell) return;

      const { col, row } = cell;

      openContextMenu({
        x,
        y,
        col,
        row,
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
      event.stopPropagation();

      if (!api) return;

      const selection = api.getSelection();
      const viewport = api.getViewportEdges();

      if (!selection) return;

      const { startRow, startCol, endCol } = selection;
      const y = api.getCellY(startRow);
      const visibleStartCol = Math.max(
        Math.min(startCol, endCol),
        viewport.startCol
      );
      const visibleEndCol = Math.min(
        Math.max(startCol, endCol),
        viewport.endCol
      );
      const middleVisibleCol = Math.floor(
        (visibleStartCol + visibleEndCol) / 2
      );
      const x = api.getCellX(middleVisibleCol);

      openContextMenu({
        x,
        y,
        col: startCol,
        row: startRow,
      });
    },
    [api, contextMenuOpen, openContextMenu]
  );

  useEffect(() => {
    document.addEventListener('keyup', onKeyUp);

    return () => {
      document.removeEventListener('keyup', onKeyUp);
    };
  }, [onKeyUp]);

  useEffect(() => {
    if (!app) return;

    app.view.addEventListener?.('contextmenu', onContextMenu);

    return () => {
      app?.view?.removeEventListener?.('contextmenu', onContextMenu);
    };
  }, [app, onContextMenu]);

  useEffect(() => {
    if (!api) return;

    const subscriptions: Subscription[] = [];

    subscriptions.push(
      api.contextMenuEvent$
        .pipe(
          filterByTypeAndCast<GridContextMenuEventOpen>(
            GridContextMenuEventType.Open
          )
        )
        .subscribe(({ x, y, col, row }) => {
          setContextMenuOpen(false);
          openedExplicitly.current = true;
          openContextMenu({ x, y, col, row });
        })
    );

    return () => {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    };
  }, [api, openContextMenu]);

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
