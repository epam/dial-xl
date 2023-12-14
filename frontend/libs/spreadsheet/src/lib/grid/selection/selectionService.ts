import { inject, injectable } from 'inversify';
import { BehaviorSubject, fromEvent, Subject, takeUntil } from 'rxjs';

import {
  COLUMN_STATE_SERVICE,
  CONFIG,
  DATA_SCROLLER,
  DATA_VIEW,
  Destroyable,
  EVENTS_SERVICE,
} from '@deltix/grid-it';
import type {
  GridItOptionsInternal,
  IColumnStateService,
  IDataScroller,
} from '@deltix/grid-it-core';
import { appendChild, createElement } from '@deltix/grid-it-core';
import { KeyboardCode, Shortcut, shortcutApi } from '@frontend/common';

import {
  getPx,
  isCellEditorOpen,
  isContextMenuOpen,
  isFormulaInputFocused,
  isModalOpen,
  isMonacoEditorEvent,
  moveViewport,
} from '../../utils';
import { DataView } from '../data';
import type { IEventsService } from '../events';
import { moveTableIcon } from './icons';
import {
  GridSelection,
  GridSelectionEvent,
  GridSelectionEventType,
  GridSelectionShortcut,
  GridSelectionShortcutType,
  ISelectionService,
} from './types';

import './selection.scss';

@injectable()
export class SelectionService extends Destroyable implements ISelectionService {
  protected selectionContainer: HTMLDivElement;
  protected root: HTMLElement;
  protected rafId: number;
  protected moveTooltip: HTMLDivElement;

  selection$: BehaviorSubject<GridSelection | null> =
    new BehaviorSubject<GridSelection | null>(null);

  shortcuts$: Subject<GridSelectionShortcut> = new Subject();

  selectionEvents$: Subject<GridSelectionEvent> = new Subject();

  protected moveParams: {
    rowDelta: number;
    colDelta: number;
    hideMoveTooltip?: boolean;
  } | null = null;

  protected _selection: GridSelection | null = null;

  protected isSelectionChanging = false;
  protected scrollTop: number;
  protected scrollLeft: number;

  // TODO: Refactor to normal cell unite
  protected tableHeader: {
    startCol: number;
    endCol: number;
  } | null;

  constructor(
    @inject(CONFIG)
    config: GridItOptionsInternal<unknown>,
    @inject(DATA_VIEW)
    protected dataView: DataView,
    @inject(COLUMN_STATE_SERVICE)
    protected columnStateService: IColumnStateService,
    @inject(DATA_SCROLLER) protected scroller: IDataScroller,
    @inject(EVENTS_SERVICE) protected events: IEventsService
  ) {
    super();

    this.scrollTop = 0;
    this.scrollLeft = 0;
    this.rafId = 0;
    this._selection = null;
    this.tableHeader = null;

    this.root = createElement('div', {
      classList: ['grid-selection-container'],
    });

    this.selectionContainer = createElement('div', {
      classList: ['grid-selection'],
    });

    this.moveTooltip = createElement('div', {
      classList: ['grid-selection-move-tooltip'],
    });
    this.moveTooltip.innerHTML = moveTableIcon;

    this.selectionContainer.appendChild(this.moveTooltip);

    appendChild(config.getRoot(), this.root);
    appendChild(this.root, this.selectionContainer);

    this.hide();

    fromEvent(document, 'keydown')
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (isModalOpen()) return;

        this.onKeydown(event as KeyboardEvent);
      });

    fromEvent(this.scroller.render(), 'mousemove')
      .pipe(takeUntil(this.destroy$))
      .subscribe((e) => this.onMouseMove(e as MouseEvent));

    fromEvent(this.scroller.render(), 'mousedown')
      .pipe(takeUntil(this.destroy$))
      .subscribe((e) => this.onMouseDown(e as MouseEvent));

    fromEvent(this.scroller.render(), 'mouseup')
      .pipe(takeUntil(this.destroy$))
      .subscribe((e) => this.onMouseUp(e as MouseEvent));

    this.dataView.scroll$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = requestAnimationFrame(() => this.onScroll());
    });

    this.dataView.rowNumberResize$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ width }) => {
        this.root.style.left = getPx(width);
      });
  }

  protected onScroll() {
    this.updateSelection(this._selection);
  }

  protected onKeydown(event: KeyboardEvent) {
    const isSelectAll = shortcutApi.is(Shortcut.SelectAll, event);

    // avoid browser default selection in all cases
    if (isSelectAll) {
      event.preventDefault();
    }

    if (
      !this._selection ||
      isCellEditorOpen() ||
      isContextMenuOpen() ||
      isModalOpen() ||
      isMonacoEditorEvent(event)
    )
      return;
    // conflicts with other shortcuts that uses alt key
    if (event.altKey) return;

    let colDelta = 0;
    let rowDelta = 0;

    const mpx = this.tableHeader
      ? this.tableHeader.endCol - this.tableHeader.startCol + 1
      : 1;

    if (isSelectAll) {
      this.shortcuts$.next({ type: GridSelectionShortcutType.SelectAll });

      return;
    }

    if (event.key === 'Escape') {
      if (this.moveParams && this._selection) {
        this.updateSelection({
          ...this._selection,
          endRow: this._selection.startRow,
          endCol: this._selection.startCol,
        });
        this.stopMoveMode();
      }

      return;
    }
    if (shortcutApi.is(Shortcut.SelectColumn, event)) {
      this.shortcuts$.next({ type: GridSelectionShortcutType.SelectColumn });

      return;
    }
    if (shortcutApi.is(Shortcut.SelectRow, event)) {
      this.shortcuts$.next({ type: GridSelectionShortcutType.SelectRow });

      return;
    }
    if (
      shortcutApi.is(Shortcut.ExtendRangeSelectionUp, event) ||
      shortcutApi.is(Shortcut.ExtendRangeSelectionDown, event) ||
      shortcutApi.is(Shortcut.ExtendRangeSelectionLeft, event) ||
      shortcutApi.is(Shortcut.ExtendRangeSelectionRight, event)
    ) {
      this.shortcuts$.next({
        type: GridSelectionShortcutType.ExtendRangeSelection,
        direction: event.key,
      });

      return;
    }

    if (
      shortcutApi.is(Shortcut.MoveSelectionNextAvailableDown, event) ||
      shortcutApi.is(Shortcut.MoveSelectionNextAvailableUp, event) ||
      shortcutApi.is(Shortcut.MoveSelectionNextAvailableLeft, event) ||
      shortcutApi.is(Shortcut.MoveSelectionNextAvailableRight, event)
    ) {
      return;
    }

    if (
      shortcutApi.is(Shortcut.RangeSelectionDown, event) ||
      shortcutApi.is(Shortcut.RangeSelectionUp, event) ||
      shortcutApi.is(Shortcut.RangeSelectionLeft, event) ||
      shortcutApi.is(Shortcut.RangeSelectionRight, event)
    ) {
      this.shortcuts$.next({
        type: GridSelectionShortcutType.RangeSelection,
        direction: event.key,
      });

      return;
    }

    switch (event.key) {
      case KeyboardCode.ArrowDown: {
        rowDelta = 1;
        break;
      }
      case KeyboardCode.ArrowUp: {
        rowDelta = -1;
        break;
      }
      case KeyboardCode.ArrowLeft: {
        colDelta = -1;
        break;
      }
      case KeyboardCode.ArrowRight: {
        colDelta = mpx;
        break;
      }
      case KeyboardCode.Tab: {
        colDelta = 1;
        event.preventDefault();
        break;
      }
      case KeyboardCode.Enter: {
        rowDelta = 1;
        if (this.moveParams) {
          this.shortcuts$.next({
            type: GridSelectionShortcutType.MoveSelectAll,
            ...this.moveParams,
          });
          this.stopMoveMode();
        }
        break;
      }
      case KeyboardCode.Home: {
        this.shortcuts$.next({
          type: GridSelectionShortcutType.SelectionToRowEdge,
          direction: KeyboardCode.ArrowLeft,
        });
        break;
      }
      case KeyboardCode.End: {
        this.shortcuts$.next({
          type: GridSelectionShortcutType.SelectionToRowEdge,
          direction: KeyboardCode.ArrowRight,
        });
        break;
      }
      default: {
        return;
      }
    }
    this.tableHeader = null;

    if (
      this.moveParams &&
      this._selection.startCol + colDelta >= 1 &&
      this._selection.startRow + rowDelta >= 1
    ) {
      this.moveParams.colDelta += colDelta;
      this.moveParams.rowDelta += rowDelta;
      this.updateSelection({
        startCol: this._selection.startCol + colDelta,
        startRow: this._selection.startRow + rowDelta,
        endRow: this._selection.endRow + rowDelta,
        endCol: this._selection.endCol + colDelta,
      });

      return;
    }

    if (!event.shiftKey) {
      if (
        this._selection.startRow + rowDelta < 1 ||
        this._selection.startCol + colDelta < 1
      ) {
        return;
      }

      this.updateSelection(
        {
          startCol: this._selection.startCol + colDelta,
          startRow: this._selection.startRow + rowDelta,
          endRow: this._selection.startRow + rowDelta,
          endCol: this._selection.startCol + colDelta,
        },
        false,
        event.key
      );

      return;
    }

    if (
      this._selection.endRow + rowDelta < 1 ||
      this._selection.endCol + colDelta < 1
    ) {
      return;
    }

    this.updateSelection({
      ...this._selection,
      endRow: this._selection.endRow + rowDelta,
      endCol: this._selection.endCol + colDelta,
    });
  }

  protected onMouseDown = (e: MouseEvent) => {
    if (
      !this.isTargetCell(e.target) ||
      isCellEditorOpen() ||
      isFormulaInputFocused()
    )
      return;

    this.stopMoveMode();

    this.tableHeader = null;

    const { col, row } = this.getCellDimensions(e.target as HTMLElement);

    this.isSelectionChanging = true;

    this.updateSelection({
      startCol: col,
      startRow: row,
      endCol: col,
      endRow: row,
    });

    this.show();
  };

  protected onMouseUp = (e: MouseEvent) => {
    this.isSelectionChanging = false;
  };

  protected onMouseMove = (e: MouseEvent) => {
    if (
      !this.isSelectionChanging ||
      !this.isTargetCell(e.target) ||
      !this._selection
    )
      return;

    const { col, row } = this.getCellDimensions(e.target as HTMLElement);

    this.updateSelection({
      ...this._selection,
      endCol: col,
      endRow: row,
    });
  };

  protected isTargetCell(target: EventTarget | null) {
    const targetElement = target as HTMLElement;

    if (
      !targetElement ||
      !targetElement.getAttribute('data-row') ||
      !targetElement.getAttribute('data-col')
    )
      return false;

    return true;
  }

  public getCellDimensions(element: HTMLElement) {
    const elementRect = element.getBoundingClientRect();
    const containerRef = this.scroller.render().getBoundingClientRect();

    const row = element.getAttribute('data-row') || -1;
    const col = element.getAttribute('data-col') || -1;

    return {
      x: elementRect.left - containerRef.left,
      y: elementRect.top - containerRef.top,
      width: elementRect.right - elementRect.left,
      height: elementRect.bottom - elementRect.top,
      row: +row,
      col: +col,
    };
  }

  protected startMoveMode(hideMoveTooltip: boolean) {
    this.moveParams = { rowDelta: 0, colDelta: 0, hideMoveTooltip };
    this.selectionContainer.classList.add('grid-selection__move');
    if (!hideMoveTooltip) {
      this.moveTooltip.style.display = 'block';

      this.moveTooltip.style.width = `${30 * this.dataView.currentZoom}px`;
      this.moveTooltip.style.height = `${30 * this.dataView.currentZoom}px`;
    }

    this.selectionEvents$.next({ type: GridSelectionEventType.StartMoveMode });
    this.show();
  }

  protected stopMoveMode() {
    this.moveParams = null;
    this.selectionContainer.classList.remove('grid-selection__move');
    this.moveTooltip.style.display = 'none';
    this.selectionEvents$.next({ type: GridSelectionEventType.StopMoveMode });
  }

  protected limitCol(col: number) {
    const [minCol, maxCol] = this.dataView.columnsEdges;

    return Math.max(minCol, Math.min(maxCol + 1, col));
  }

  protected limitRow(row: number) {
    const [minRow, maxRow] = this.dataView.edges;

    return Math.max(minRow, Math.min(maxRow + 1, row));
  }

  get selection() {
    if (!this._selection) return null;
    const { startCol, startRow, endCol, endRow } = this._selection;

    return {
      startCol: this.limitCol(Math.min(startCol, endCol)),
      startRow: this.limitRow(Math.min(startRow, endRow)),
      endCol: this.limitCol(Math.max(endCol, startCol) + 1),
      endRow: this.limitRow(Math.max(endRow, startRow) + 1),
    };
  }

  protected updateSelection(
    updatedSelection: GridSelection | null,
    quiet = false,
    key?: string
  ) {
    this._selection = updatedSelection;

    if (!this.selection) return;

    this.show();

    const { startCol, endCol, endRow, startRow } = this.selection;

    const { x: x1, y: y1 } = this.dataView.getCellPosition(startCol, startRow);
    const { x: x2, y: y2 } = this.dataView.getCellPosition(endCol, endRow);

    const width = Math.abs(x1 - x2);
    const height = Math.abs(y1 - y2);

    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2) + 1;

    this.selectionContainer.style.transform = `translate(${x}px, ${y}px)`;
    this.selectionContainer.style.width = `${width}px`;
    this.selectionContainer.style.height = `${height}px`;
    this.selectionContainer.style.display =
      width === 0 || height === 0 ? 'none' : 'block';

    if (this.tableHeader) {
      const { startCol, endCol } = this.tableHeader;

      const { x: tableX1 } = this.dataView.getCellPosition(startCol, startRow);
      const { x: tableX2 } = this.dataView.getCellPosition(endCol + 1, endRow);

      this.selectionContainer.style.transform = `translate(${x}px, ${y}px)`;
      this.selectionContainer.style.width = `${tableX2 - tableX1}px`;
      this.selectionContainer.style.height = `${height}px`;
    }

    if (key && this._selection && !this.moveParams) {
      moveViewport(
        key,
        this._selection.startCol,
        this._selection.startRow,
        this.dataView.currentZoom
      );
    }

    if (!quiet) {
      this.selection$.next(this._selection);
    }
  }

  isTableHeaderSelected() {
    return !!this.tableHeader;
  }

  getSelectedPinnedCols() {
    if (!this._selection) return null;

    if (this.tableHeader) {
      return {
        startCol: this.tableHeader.startCol,
        endCol: this.tableHeader.endCol,
      };
    }

    return {
      startCol: this._selection?.startCol,
      endCol: this._selection?.endCol,
    };
  }

  selectTableHeader(startCol: number, endCol: number) {
    if (!this._selection) return;

    this.tableHeader = { startCol, endCol };

    this.updateSelection(
      {
        ...this._selection,
        startCol: startCol,
        endCol: endCol,
      },
      true
    );
  }

  setSelection(
    selection: GridSelection | null,
    moveMode = false,
    hideMoveTooltip = false
  ) {
    if (!selection) {
      this.clear();

      return;
    }

    if (moveMode) {
      this.startMoveMode(hideMoveTooltip);
    } else {
      this.stopMoveMode();
    }

    this.tableHeader = null;

    this.updateSelection(selection);
  }

  clear() {
    this.selection$.next(null);
    this._selection = null;
    this.tableHeader = null;
    this.hide();
  }

  hide() {
    this.selectionContainer.style.display = 'none';
  }

  show() {
    this.selectionContainer.style.display = 'block';
  }

  destroy() {
    this.selectionEvents$.unsubscribe();
    this.root.remove();
    super.destroy();
  }

  protected reset = () => {
    this.columnStateService.reset();
  };
}
