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
  GridListFilter,
  KeyboardCode,
  MenuItem,
  Shortcut,
  shortcutApi,
  useClickOutside,
  useIsMobile,
} from '@frontend/common';
import { ParsedSheets } from '@frontend/parser';
import { Application } from '@pixi/app';

import { canvasId, mouseRightButton } from '../../constants';
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
  filterList: GridListFilter[];
};

const gridContextMenuRootClass = 'grid-context-menu';

export function ContextMenu({
  app,
  apiRef,
  gridCallbacksRef,
  functions,
  parsedSheets,
  inputFiles,
  filterList,
}: Props) {
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [contextMenuItems, setContextMenuItems] = useState<MenuItem[]>([]);
  const [openContextMenuParams, setOpenContextMenuParams] =
    useState<OpenContextMenuParams>();
  const isMobile = useIsMobile();

  const openedExplicitly = useRef(false);
  const explicitSource = useRef<'canvas-element' | 'html-element' | undefined>(
    undefined
  );
  const clickRef = useRef<HTMLDivElement>(null);
  const isRightMouseDown = useRef(false);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);
  const didRightDrag = useRef(false);
  const contextMenuTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (
      openedExplicitly.current &&
      explicitSource.current === 'canvas-element'
    ) {
      openedExplicitly.current = false;
      explicitSource.current = undefined;

      return;
    }

    openedExplicitly.current = false;
    explicitSource.current = undefined;
    setContextMenuOpen(false);
  }, []);

  const handleCreateTableBySize = useCallback(
    (cols: number, rows: number) => {
      if (!gridCallbacks || !api) return;

      const colsItems = new Array(cols).fill('');
      const rowsItems = new Array(rows).fill(colsItems);
      const selectionEdges = api.selection$.getValue();

      gridCallbacks.onCreateManualTable?.(
        selectionEdges?.startCol ?? 1,
        selectionEdges?.startRow ?? 1,
        rowsItems
      );
    },
    [gridCallbacks, api]
  );

  useClickOutside(clickRef, onClickOutside, ['click', 'contextmenu'], true);

  const openContextMenu = useCallback(
    (params: OpenContextMenuParams | null) => {
      if (!params || !api) return;

      const { x, y } = params;

      setContextMenuOpen(true);
      setContextMenuPos({ x, y });
      setOpenContextMenuParams(params);
    },
    [api]
  );

  useEffect(() => {
    if (!contextMenuOpen || !openContextMenuParams || !api) return;

    const { col, row } = openContextMenuParams;
    const cellData = api.getCell(col, row);

    setTimeout(() => {
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
          getTableFieldMenuItems(
            col,
            row,
            cellData,
            gridCallbacks,
            filterList,
            apiRef.current
          )
        );
      } else if (gridCallbacks) {
        setContextMenuItems(
          getTableCellMenuItems(
            col,
            row,
            cellData,
            gridCallbacks,
            filterList,
            apiRef.current
          )
        );
      }
    });
  }, [
    api,
    apiRef,
    contextMenuOpen,
    filterList,
    functions,
    gridCallbacks,
    handleCreateTableBySize,
    inputFiles,
    openContextMenuParams,
    parsedSheets,
  ]);

  const onContextMenu = useCallback(
    (e: Event) => {
      e.preventDefault();

      if (didRightDrag.current) {
        didRightDrag.current = false;

        return;
      }

      const mousePosition = getMousePosition(e as MouseEvent);

      if (!mousePosition || !api) return;

      const { x, y } = mousePosition;
      const cell = api.getCellFromCoords(x, y);

      if (!cell) return;

      const { col, row } = cell;

      // Delay opening the context menu (not to interfere with dragging by right mouse button)
      contextMenuTimeout.current = setTimeout(() => {
        if (didRightDrag.current) return;

        openContextMenu({ x, y, col, row });
      }, 150);
    },
    [api, openContextMenu]
  );

  const onMouseDown = useCallback(
    (e: MouseEvent) => {
      if (e.button === mouseRightButton || isMobile) {
        isRightMouseDown.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        didRightDrag.current = false;

        onContextMenu(e);
      }
    },
    [isMobile, onContextMenu]
  );

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      if (e.button !== mouseRightButton && !isMobile) return;

      isRightMouseDown.current = false;
      lastMousePos.current = null;
      if (contextMenuTimeout.current) {
        clearTimeout(contextMenuTimeout.current);
        contextMenuTimeout.current = null;
      }
    },
    [isMobile]
  );

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isRightMouseDown.current || !lastMousePos.current) return;

    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      didRightDrag.current = true;

      if (contextMenuTimeout.current) {
        clearTimeout(contextMenuTimeout.current);
        contextMenuTimeout.current = null;
      }
    }

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, []);

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

      const selection = api.selection$.getValue();
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
    app.view.addEventListener?.('pointerdown', onMouseDown as EventListener);
    window.addEventListener?.('pointermove', onMouseMove);
    window.addEventListener?.('pointerup', onMouseUp);

    return () => {
      app?.view?.removeEventListener?.('contextmenu', onContextMenu);
      app?.view?.removeEventListener?.(
        'pointerdown',
        onMouseDown as EventListener
      );
      window.removeEventListener?.('pointermove', onMouseMove);
      window.removeEventListener?.('pointerup', onMouseUp);
    };
  }, [app, onContextMenu, onMouseDown, onMouseMove, onMouseUp]);

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
        .subscribe(({ x, y, col, row, source }) => {
          setContextMenuOpen(false);
          openedExplicitly.current = true;
          explicitSource.current = source;
          openContextMenu({ x, y, col, row });
        })
    );

    return () => {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    };
  }, [api, openContextMenu]);

  useEffect(() => {
    if (!contextMenuOpen) return;

    setTimeout(() => {
      const menuContainer = document.querySelector(
        `.${gridContextMenuRootClass} .ant-dropdown-menu`
      );

      if (!menuContainer) return;

      (menuContainer as HTMLDivElement).focus();
    }, 0);
  }, [contextMenuOpen]);

  /*
   * Calculate max-height for a dropdown in case of a small screen
   * Using align={{ overflow: { adjustY: true } }} causes a context menu judders
   * when it's opened near the corner of the screen
   * https://github.com/ant-design/ant-design/issues/51916
   */
  useEffect(() => {
    setTimeout(() => {
      const menuContainer = document.querySelector(
        `.${gridContextMenuRootClass}`
      );

      if (!contextMenuOpen || !menuContainer) return;

      const padding = 15;
      const topOffset = contextMenuPos.y;
      const container = document.getElementById(canvasId);
      if (!container) return;

      const { top: canvasTopOffset } = container.getBoundingClientRect();
      const absoluteTopPos = topOffset + canvasTopOffset;

      const willOpenDown = window.innerHeight / 2 > absoluteTopPos;

      const availableSpace = willOpenDown
        ? window.innerHeight - absoluteTopPos - padding
        : absoluteTopPos - padding;

      const ulElement = menuContainer.querySelector('ul');

      if (!ulElement) return;
      const actualContentHeight = ulElement.scrollHeight;

      if (actualContentHeight > availableSpace) {
        ulElement.style.maxHeight = `${availableSpace}px`;
      } else {
        ulElement.style.maxHeight = '100vh';
      }
    }, 0);
  }, [contextMenuOpen, contextMenuPos]);

  return (
    <Dropdown
      align={{ offset: [3, -3] }}
      autoAdjustOverflow={true}
      destroyPopupOnHide={true}
      forceRender={true}
      menu={{ items: contextMenuItems, onClick }}
      open={contextMenuOpen}
      rootClassName={gridContextMenuRootClass}
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
