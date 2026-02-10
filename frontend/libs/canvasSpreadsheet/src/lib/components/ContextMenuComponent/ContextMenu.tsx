import { Dropdown } from 'antd';
import { Application } from 'pixi.js';
import {
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Subscription } from 'rxjs';

import {
  FunctionInfo,
  GridListFilter,
  KeyboardCode,
  MenuItem,
  ResourceMetadata,
  SharedWithMeMetadata,
  Shortcut,
  shortcutApi,
  useClickOutside,
  useIsMobile,
} from '@frontend/common';
import { ParsedSheets } from '@frontend/parser';
import { MenuInfo } from '@rc-component/menu/lib/interface';

import { canvasId, mouseRightButton } from '../../constants';
import { GridApi } from '../../types';
import {
  filterByTypeAndCast,
  getCellContext,
  getMousePosition,
  GridEventBus,
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
  apiRef: RefObject<GridApi | null>;
  eventBus: GridEventBus;
  functions: FunctionInfo[];
  parsedSheets: ParsedSheets;
  inputFiles: (ResourceMetadata | SharedWithMeMetadata)[] | null;
  filterList: GridListFilter[];
};

const gridContextMenuRootClass = 'grid-context-menu';
type OpenReason = 'mouse' | 'keyboard' | 'api';

export function ContextMenu({
  app,
  apiRef,
  eventBus,
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

  const [openReason, setOpenReason] = useState<OpenReason>('mouse');
  const openedExplicitly = useRef(false);
  const explicitSource = useRef<'canvas-element' | 'html-element' | undefined>(
    undefined,
  );
  const clickRef = useRef<HTMLDivElement>(null);
  const isRightMouseDown = useRef(false);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);
  const didRightDrag = useRef(false);
  const contextMenuTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { onClickContextMenu } = useOnClickContextMenu({
    apiRef,
    eventBus,
  });

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
      const api = apiRef.current;
      if (!api) return;

      const colsItems = new Array(cols).fill('');
      const rowsItems = new Array(rows).fill(colsItems);
      const selectionEdges = api.selection$.getValue();

      eventBus.emit({
        type: 'tables/create-manual',
        payload: {
          col: selectionEdges?.startCol ?? 1,
          row: selectionEdges?.startRow ?? 1,
          cells: rowsItems,
        },
      });
    },
    [apiRef, eventBus],
  );

  useClickOutside(clickRef, onClickOutside, ['click', 'contextmenu'], true);

  const buildContextMenuItems = useCallback(
    (params: OpenContextMenuParams, api: GridApi): MenuItem[] => {
      const { col, row } = params;
      const cellData = api.getCell(col, row);

      if (!cellData?.table) {
        const contextCell = getCellContext(api.getCell, col, row);

        if (!contextCell?.table) {
          return getEmptyCellWithoutContextMenuItem(
            functions,
            parsedSheets,
            inputFiles,
            handleCreateTableBySize,
            col,
            row,
          );
        }

        return getEmptyCellMenuItems(col, row, contextCell);
      }

      if (cellData.isTableHeader || cellData.table?.chartType) {
        return getTableHeaderMenuItems(cellData);
      }

      if (cellData.isFieldHeader && cellData.field) {
        return getTableFieldMenuItems(col, row, cellData, eventBus, filterList);
      }

      return getTableCellMenuItems(col, row, cellData, eventBus, filterList);
    },
    [
      eventBus,
      filterList,
      functions,
      handleCreateTableBySize,
      inputFiles,
      parsedSheets,
    ],
  );

  const openContextMenu = useCallback(
    (params: OpenContextMenuParams | null, reason: OpenReason = 'mouse') => {
      const api = apiRef.current;
      if (!params || !api) return;

      const { x, y } = params;
      const items = buildContextMenuItems(params, api);

      setContextMenuItems(items);
      setContextMenuPos({ x, y });
      setOpenContextMenuParams(params);
      setOpenReason(reason);
      setContextMenuOpen(true);
    },
    [apiRef, buildContextMenuItems],
  );

  const onContextMenu = useCallback(
    (e: Event) => {
      e.preventDefault();

      if (didRightDrag.current) {
        didRightDrag.current = false;

        return;
      }

      const mousePosition = getMousePosition(e as MouseEvent);

      const api = apiRef.current;

      if (!mousePosition || !api) return;

      const { x, y } = mousePosition;
      const cell = api.getCellFromCoords(x, y);

      if (!cell) return;

      const { col, row } = cell;

      // Delay opening the context menu (not to interfere with dragging by right mouse button)
      contextMenuTimeout.current = setTimeout(() => {
        if (didRightDrag.current) return;

        openContextMenu({ x, y, col, row }, 'mouse');
      }, 150);
    },
    [apiRef, openContextMenu],
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
    [isMobile, onContextMenu],
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
    [isMobile],
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
    [onClickContextMenu],
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

      const api = apiRef.current;

      if (!api) return;

      const selection = api.selection$.getValue();
      const viewport = api.getViewportEdges();

      if (!selection) return;

      const { startRow, startCol, endCol } = selection;
      const y = api.getCellY(startRow);
      const visibleStartCol = Math.max(
        Math.min(startCol, endCol),
        viewport.startCol,
      );
      const visibleEndCol = Math.min(
        Math.max(startCol, endCol),
        viewport.endCol,
      );
      const middleVisibleCol = Math.floor(
        (visibleStartCol + visibleEndCol) / 2,
      );
      const x = api.getCellX(middleVisibleCol);

      openContextMenu({ x, y, col: startCol, row: startRow }, 'keyboard');
    },
    [apiRef, contextMenuOpen, openContextMenu],
  );

  // Update menu items to show current filter values
  useEffect(() => {
    const api = apiRef.current;

    if (!api || !contextMenuOpen || !openContextMenuParams) return;

    const items = buildContextMenuItems(openContextMenuParams, api);
    setContextMenuItems(items);
  }, [
    contextMenuOpen,
    openContextMenuParams,
    buildContextMenuItems,
    apiRef,
    filterList,
  ]);

  useEffect(() => {
    document.addEventListener('keyup', onKeyUp);

    return () => {
      document.removeEventListener('keyup', onKeyUp);
    };
  }, [onKeyUp]);

  useEffect(() => {
    if (!app?.renderer) return;

    app.canvas.addEventListener?.('contextmenu', onContextMenu);
    app.canvas.addEventListener?.('pointerdown', onMouseDown as EventListener);
    window.addEventListener?.('pointermove', onMouseMove);
    window.addEventListener?.('pointerup', onMouseUp);

    return () => {
      if (!app?.renderer) return;

      app?.canvas?.removeEventListener?.('contextmenu', onContextMenu);
      app?.canvas?.removeEventListener?.(
        'pointerdown',
        onMouseDown as EventListener,
      );
      window.removeEventListener?.('pointermove', onMouseMove);
      window.removeEventListener?.('pointerup', onMouseUp);
    };
  }, [app, onContextMenu, onMouseDown, onMouseMove, onMouseUp]);

  useEffect(() => {
    const api = apiRef.current;

    if (!api) return;

    const subscriptions: Subscription[] = [];

    subscriptions.push(
      api.contextMenuEvent$
        .pipe(
          filterByTypeAndCast<GridContextMenuEventOpen>(
            GridContextMenuEventType.Open,
          ),
        )
        .subscribe(({ x, y, col, row, source }) => {
          openedExplicitly.current = true;
          explicitSource.current = source;
          openContextMenu({ x, y, col, row });
        }),
    );

    return () => {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    };
  }, [apiRef, openContextMenu]);

  useLayoutEffect(() => {
    if (!contextMenuOpen) return;
    if (openReason !== 'keyboard') return;

    const menuContainer = document.querySelector(
      `.${gridContextMenuRootClass} .ant-dropdown-menu`,
    ) as HTMLDivElement | null;

    menuContainer?.focus();
  }, [contextMenuOpen, openReason]);

  /*
   * Calculate max-height for a dropdown in case of a small screen
   * Using align={{ overflow: { adjustY: true } }} causes a context menu judders
   * when it's opened near the corner of the screen
   * https://github.com/ant-design/ant-design/issues/51916
   */
  useLayoutEffect(() => {
    const menuContainer = document.querySelector(
      `.${gridContextMenuRootClass}`,
    ) as HTMLDivElement | null;

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

    const ulElement = menuContainer.querySelector(
      'ul',
    ) as HTMLUListElement | null;
    if (!ulElement) return;

    const actualContentHeight = ulElement.scrollHeight;

    ulElement.style.maxHeight =
      actualContentHeight > availableSpace ? `${availableSpace}px` : '100vh';
  }, [contextMenuOpen, contextMenuPos]);

  // Use React way to force re-rendering Dropdown when the menu position changes
  const dropdownKey = useMemo(() => {
    if (openContextMenuParams)
      return `${openContextMenuParams.col}-${openContextMenuParams.row}`;

    return 'closed-canvas-dropdown';
  }, [openContextMenuParams]);

  return (
    <Dropdown
      align={{ offset: [3, -3] }}
      autoAdjustOverflow={true}
      destroyOnHidden={true}
      key={dropdownKey}
      menu={{
        items: contextMenuItems,
        onClick,
        triggerSubMenuAction: 'hover',
        subMenuOpenDelay: 0,
        subMenuCloseDelay: 0.3,
      }}
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
