import { Dropdown } from 'antd';
import { Application } from 'pixi.js';
import {
  useCallback,
  useContext,
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
  ResourceMetadata,
  SharedWithMeMetadata,
  Shortcut,
  shortcutApi,
  useClickOutside,
  useIsMobile,
} from '@frontend/common';
import { ParsedSheets } from '@frontend/parser';
import { MenuInfo } from '@rc-component/menu/lib/interface';

import { mouseRightButton } from '../../constants';
import { GridStateContext, GridViewportContext } from '../../context';
import { SheetControl } from '../../types';
import {
  filterByTypeAndCast,
  getCellContext,
  getMousePosition,
  GridEventBus,
} from '../../utils';
import {
  getEmptyCellMenuItems,
  getTableCellMenuItems,
  getTableFieldMenuItems,
  getTableHeaderMenuItems,
  GridContextMenuEventOpen,
  GridContextMenuEventType,
  OpenContextMenuParams,
  useOnClickContextMenu,
} from './utils';
import { useEmptyCellItems } from './utils/contextMenuItems/useEmptyCellItems';

type Props = {
  app: Application | null;
  eventBus: GridEventBus;
  functions: FunctionInfo[];
  parsedSheets: ParsedSheets;
  inputFiles: (ResourceMetadata | SharedWithMeMetadata)[] | null;
  filterList: GridListFilter[];
  sheetControls: SheetControl[];
};

const gridContextMenuRootClass = 'grid-context-menu';
type OpenReason = 'mouse' | 'keyboard' | 'api';

export function ContextMenu({
  app,
  eventBus,
  functions,
  parsedSheets,
  inputFiles,
  filterList,
  sheetControls,
}: Props) {
  const { canvasId, selectionEdges, getCell, contextMenuEvent$ } =
    useContext(GridStateContext);
  const { getCellFromCoords, viewportEdges, getCellY, getCellX } =
    useContext(GridViewportContext);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [openContextMenuParams, setOpenContextMenuParams] =
    useState<OpenContextMenuParams>();
  const isMobile = useIsMobile();

  const [openReason, setOpenReason] = useState<OpenReason>('mouse');
  const [openKeys, setOpenKeys] = useState<string[]>([]);
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
      const colsItems = new Array(cols).fill('');
      const rowsItems = new Array(rows).fill(colsItems);

      eventBus.emit({
        type: 'tables/create-manual',
        payload: {
          col: selectionEdges?.startCol ?? 1,
          row: selectionEdges?.startRow ?? 1,
          cells: rowsItems,
        },
      });
    },
    [eventBus, selectionEdges?.startCol, selectionEdges?.startRow],
  );

  useClickOutside(clickRef, onClickOutside, ['click', 'contextmenu'], true);

  const emptyCellItems = useEmptyCellItems(
    functions,
    parsedSheets,
    inputFiles,
    handleCreateTableBySize,
    contextMenuOpen,
    openContextMenuParams?.col,
    openContextMenuParams?.row,
  );

  const contextMenuItems = useMemo(() => {
    if (!openContextMenuParams || !getCell) return [];

    const { col, row } = openContextMenuParams;
    // eslint-disable-next-line react-hooks/refs
    const cellData = getCell(col, row);

    if (!cellData?.table) {
      // eslint-disable-next-line react-hooks/refs
      const contextCell = getCellContext(getCell, col, row);

      if (!contextCell?.table) {
        return emptyCellItems;
      }

      return getEmptyCellMenuItems(col, row, contextCell);
    }

    if (cellData.isTableHeader || cellData.table?.chartType) {
      return getTableHeaderMenuItems(cellData);
    }

    if (cellData.isFieldHeader && cellData.field) {
      return getTableFieldMenuItems({
        col,
        row,
        cell: cellData,
        eventBus,
        filterList,
        sheetControls,
        onClose: () => setContextMenuOpen(false),
      });
    }

    return getTableCellMenuItems({
      col,
      row,
      cell: cellData,
      eventBus,
      filterList,
      sheetControls,
      onClose: () => setContextMenuOpen(false),
    });
  }, [
    emptyCellItems,
    eventBus,
    filterList,
    getCell,
    openContextMenuParams,
    sheetControls,
  ]);

  const openContextMenu = useCallback(
    (params: OpenContextMenuParams | null, reason: OpenReason = 'mouse') => {
      if (!params) return;

      const { x, y } = params;

      setContextMenuPos({ x, y });
      setOpenContextMenuParams(params);
      setOpenReason(reason);
      setContextMenuOpen(true);
    },
    [],
  );

  const onContextMenu = useCallback(
    (e: Event) => {
      e.preventDefault();

      if (didRightDrag.current) {
        didRightDrag.current = false;

        return;
      }

      const mousePosition = getMousePosition(e as MouseEvent, canvasId);

      if (!mousePosition) return;

      const { x, y } = mousePosition;
      const cell = getCellFromCoords(x, y);

      const { col, row } = cell;

      // Delay opening the context menu (not to interfere with dragging by right mouse button)
      contextMenuTimeout.current = setTimeout(() => {
        if (didRightDrag.current) return;

        openContextMenu({ x, y, col, row }, 'mouse');
      }, 150);
    },
    [canvasId, getCellFromCoords, openContextMenu],
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

      const viewport = viewportEdges.current;

      if (!selectionEdges) return;

      const { startRow, startCol, endCol } = selectionEdges;
      const y = getCellY(startRow);
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
      const x = getCellX(middleVisibleCol);

      openContextMenu({ x, y, col: startCol, row: startRow }, 'keyboard');
    },
    [
      contextMenuOpen,
      getCellX,
      getCellY,
      openContextMenu,
      selectionEdges,
      viewportEdges,
    ],
  );

  // We want to not close context menu if unhover submenu, only if other submenu opened
  const handleOpenChange = useCallback(
    (keys: string[]) => {
      // Keep only the latest submenu open
      if (keys.length === 0) return;

      const newKey = keys[keys.length - 1];
      const newItemOpenedHighLevel = !!contextMenuItems.find(
        (item) => item?.key === newKey,
      );

      setOpenKeys(newItemOpenedHighLevel ? [newKey] : keys);
    },
    [contextMenuItems],
  );

  useEffect(() => {
    setOpenKeys([]);
  }, [contextMenuOpen]);

  useEffect(() => {
    document.addEventListener('keyup', onKeyUp);

    return () => {
      document.removeEventListener('keyup', onKeyUp);
    };
  }, [onKeyUp]);

  const onContextMenuRef = useRef<EventListener>(onContextMenu);
  // eslint-disable-next-line react-hooks/refs
  onContextMenuRef.current = onContextMenu;
  const onMouseDownRef = useRef<EventListener>(onMouseDown as EventListener);
  // eslint-disable-next-line react-hooks/refs
  onMouseDownRef.current = onMouseDown as EventListener;
  const onMouseMoveRef = useRef<EventListener>(onMouseMove as EventListener);
  // eslint-disable-next-line react-hooks/refs
  onMouseMoveRef.current = onMouseMove as EventListener;
  const onMouseUpRef = useRef<EventListener>(onMouseUp as EventListener);
  // eslint-disable-next-line react-hooks/refs
  onMouseUpRef.current = onMouseUp as EventListener;

  useEffect(() => {
    if (!app?.renderer) return;

    app.canvas.addEventListener?.('contextmenu', onContextMenuRef.current);
    app.canvas.addEventListener?.('pointerdown', onMouseDownRef.current);
    window.addEventListener?.('pointermove', onMouseMoveRef.current);
    window.addEventListener?.('pointerup', onMouseUpRef.current);

    return () => {
      window.removeEventListener?.('pointermove', onMouseMoveRef.current);
      window.removeEventListener?.('pointerup', onMouseUpRef.current);

      if (!app?.renderer) return;

      app?.canvas?.removeEventListener?.(
        'contextmenu',
        onContextMenuRef.current,
      );
      app?.canvas?.removeEventListener?.('pointerdown', onMouseDownRef.current);
    };
  }, [app]);

  useEffect(() => {
    const subscriptions: Subscription[] = [];

    subscriptions.push(
      contextMenuEvent$.current
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
  }, [contextMenuEvent$, openContextMenu]);

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
  }, [canvasId, contextMenuOpen, contextMenuPos]);

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
        onOpenChange: handleOpenChange,
        openKeys,
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
