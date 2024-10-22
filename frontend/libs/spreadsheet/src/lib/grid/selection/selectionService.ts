import { inject, injectable } from 'inversify';
import { BehaviorSubject, fromEvent, Subject, takeUntil } from 'rxjs';

import {
  COLUMN_STATE_SERVICE,
  CONFIG,
  DATA_SCROLLER,
  DATA_SERVICE,
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
import {
  gridDataScrollerClass,
  isContextMenuOpen,
  isFormulaBarInputFocused,
  isFormulaBarMonacoInputFocused,
  isModalOpen,
  isMonacoEditorEvent,
  KeyboardCode,
  Shortcut,
  shortcutApi,
} from '@frontend/common';

import { resizeCellTriggerClass } from '../../constants';
import { defaults } from '../../defaults';
import {
  getCellElementDimensions,
  getPx,
  isCellEditorOpen,
  isNoteOpen,
  isSpreadsheetTarget,
  moveViewport,
} from '../../utils';
import { DataView, type IDataService } from '../data';
import type { IEventsService } from '../events';
import { moveTableIcon } from './icons';
import {
  GridSelection,
  GridSelectionEvent,
  GridSelectionEventType,
  GridSelectionShortcut,
  GridSelectionShortcutType,
  ISelectionService,
  MoveParams,
  SelectionBackup,
} from './types';

import './selection.scss';

/**
 * Selection service provides selection on spreadsheet, you can select cells, move tables, dnd tables and showing selection in future place.
 * @property {HTMLDivContainer} selectionContainer - selection element
 * @property {HTMLContainer} root - html container of selection elements
 * @property {number} rafId - last requested animation frame
 * @property {HTMLDivElement} moveTooltip - tooltip which displays in left corner by moving table to show additional information
 * @property {HTMLSpanElement} moveTooltipText - reference to text inside tooltip container
 * @property {HTMLDivElement} moveTooltipIcon - reference to icon inside tooltip container
 * @property {BehaviorSubject<GridSelection | null>} selection$ - triggers action every time when selection changes
 * @property {Subject<GridSelectionShortcut>} shortcuts$ - trigger action every time when shortcut was pressed (shortcuts that related with grid selection, for example: extend selection up, select all table, etc.)
 * @property {Subject<GridSelectionEvent>} selectionEvents$ - trigger action every time when selection event happens (like start moving selection, stop moving selection, check CTRL + A for table case in selectionService)
 * @property {MoveParams} moveParams - params of selection which in move mode
 * @property {GridSelection | null} _selection - internal selection state
 * @property {boolean} isSelectionChanging - when selection following by cursor, we should cancel all callbacks until it stops
 * @property {number} scrollTop - internal copy of scrollTop of DataView
 * @property {number} scrollLeft - internal copy of scrollLeft of DataView
 */
@injectable()
export class SelectionService extends Destroyable implements ISelectionService {
  protected selectionContainer: HTMLDivElement;
  protected root: HTMLElement;
  protected rafId: number;
  protected moveTooltip: HTMLDivElement;
  protected moveTooltipText: HTMLSpanElement;
  protected moveTooltipIcon: HTMLDivElement;
  protected dottedSelection: HTMLDivElement;

  selection$: BehaviorSubject<GridSelection | null> =
    new BehaviorSubject<GridSelection | null>(null);

  shortcuts$: Subject<GridSelectionShortcut> = new Subject();

  selectionEvents$: Subject<GridSelectionEvent> = new Subject();

  protected moveParams: MoveParams | null = null;

  protected _selection: GridSelection | null = null;
  protected _dottedSelection: GridSelection | null = null;

  protected isSelectionChanging = false;
  protected scrollTop: number;
  protected scrollLeft: number;

  protected isPointClickMode = false;
  protected selectionBackup: SelectionBackup | null = null;

  constructor(
    @inject(CONFIG)
    config: GridItOptionsInternal<unknown>,
    @inject(DATA_VIEW)
    protected dataView: DataView,
    @inject(COLUMN_STATE_SERVICE)
    protected columnStateService: IColumnStateService,
    @inject(DATA_SCROLLER) protected scroller: IDataScroller,
    @inject(EVENTS_SERVICE) protected events: IEventsService,
    @inject(DATA_SERVICE) protected api: IDataService
  ) {
    super();

    this.scrollTop = 0;
    this.scrollLeft = 0;
    this.rafId = 0;
    this._selection = null;

    this.root = createElement('div', {
      classList: ['grid-selection-container'],
    });

    this.selectionContainer = createElement('div', {
      classList: ['grid-selection'],
    });

    this.moveTooltipText = createElement('span', {
      classList: ['grid-selection-move-tooltip__text'],
    });

    this.moveTooltipText.textContent = 'Use';

    this.moveTooltip = createElement('div', {
      classList: ['grid-selection-move-tooltip'],
    });

    this.dottedSelection = createElement('div', {
      classList: ['grid-selection-dottedSelection'],
    });

    this.moveTooltipIcon = createElement('div', {
      classList: ['grid-selection-move-tooltip__icon'],
    });

    this.moveTooltipIcon.innerHTML = moveTableIcon;

    this.moveTooltip.appendChild(this.moveTooltipText);
    this.moveTooltip.appendChild(this.moveTooltipIcon);

    this.selectionContainer.appendChild(this.moveTooltip);

    appendChild(config.getRoot(), this.root);
    appendChild(this.root, this.selectionContainer);
    appendChild(this.root, this.dottedSelection);

    this.hide();
    this.updateSelectionDataset();

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

  /**
   * Redraw selection after scroll
   */
  protected onScroll(): void {
    this.updateSelection({ updatedSelection: this._selection });
    if (this._dottedSelection) {
      this.showDottedSelection(this._dottedSelection);
    }
  }

  /**
   * Handles keydown events to distribute it by right observables and calls needed callbacks
   * @param event {KeyboardEvent} keyboard event
   */
  public onKeyDown(event: KeyboardEvent): void {
    if (
      !isSpreadsheetTarget(event) ||
      isModalOpen() ||
      isNoteOpen() ||
      this.isPointClickMode
    )
      return;

    const isSelectAll = shortcutApi.is(Shortcut.SelectAll, event);

    // avoid browser default selection in all cases
    if (isSelectAll) {
      event.preventDefault();
    }

    if (
      !this._selection ||
      isCellEditorOpen() ||
      isContextMenuOpen() ||
      isMonacoEditorEvent(event)
    )
      return;
    // conflicts with other shortcuts that uses alt key
    if (event.altKey) return;

    let colDelta = 0;
    let rowDelta = 0;

    if (isSelectAll) {
      this.shortcuts$.next({ type: GridSelectionShortcutType.SelectAll });

      return;
    }

    if (event.key === 'Escape') {
      if (this.moveParams && this._selection) {
        this.updateSelection({
          updatedSelection: {
            ...this._selection,
            endRow: this._selection.startRow,
            endCol: this._selection.startCol,
          },
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
        colDelta = 1;
        break;
      }
      case KeyboardCode.Tab: {
        event.preventDefault();
        this.shortcuts$.next({
          type: GridSelectionShortcutType.TabNavigation,
        });

        return;
      }
      case KeyboardCode.Enter: {
        rowDelta = 1;
        if (this.moveParams) {
          this.shortcuts$.next({
            type: GridSelectionShortcutType.MoveSelectAll,
            ...this.moveParams,
          });
          this.stopMoveMode();

          return;
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

    if (
      this.moveParams &&
      this._selection.startCol + colDelta >= 1 &&
      this._selection.startRow + rowDelta >= 1
    ) {
      this.moveParams.colDelta += colDelta;
      this.moveParams.rowDelta += rowDelta;
      this.updateSelection({
        updatedSelection: {
          startCol: this._selection.startCol + colDelta,
          startRow: this._selection.startRow + rowDelta,
          endRow: this._selection.endRow + rowDelta,
          endCol: this._selection.endCol + colDelta,
        },
      });

      moveViewport(
        event.key,
        this._selection.startCol + colDelta,
        this._selection.startRow + rowDelta,
        this.dataView.currentZoom
      );

      return;
    }

    const colDirection =
      (colDelta && (colDelta > 0 ? 'right' : 'left')) || undefined;
    const rowDirection =
      (rowDelta && (rowDelta > 0 ? 'bottom' : 'top')) || undefined;
    let newSelection: GridSelection;

    if (event.shiftKey) {
      const nextCell = this.api.getNextCell({
        col: this._selection.endCol,
        row: this._selection.endRow,
        colDirection,
        rowDirection,
      });

      newSelection = {
        startCol: this._selection.startCol,
        startRow: this._selection.startRow,
        endCol: nextCell.col,
        endRow: nextCell.row,
      };
    } else {
      const nextCell = this.api.getNextCell({
        col:
          colDirection === 'right'
            ? this._selection.endCol
            : this._selection.startCol,
        row:
          rowDirection === 'bottom'
            ? this._selection.endRow
            : this._selection.startRow,
        colDirection,
        rowDirection,
      });

      const { cols, rows } = defaults.viewport;

      const updatedCol = Math.min(cols, Math.max(1, nextCell.col));
      const updatedRow = Math.min(rows, Math.max(1, nextCell.row));

      newSelection = {
        startCol: updatedCol,
        startRow: updatedRow,
        endCol: updatedCol,
        endRow: updatedRow,
      };
    }

    this.updateSelection({
      updatedSelection: newSelection,
      quiet: false,
      key: event.key,
    });
    this.moveViewportToSelection(newSelection.endCol, newSelection.endRow);
  }

  /**
   * Handles mouse down event, it should start extend selection by following cursor
   * @param e {MouseEvent} mouse event
   */
  protected onMouseDown = (e: MouseEvent): void => {
    if (!this.isPointClickMode) {
      if (
        !this.isTargetCell(e.target) ||
        isCellEditorOpen() ||
        isFormulaBarMonacoInputFocused() ||
        isFormulaBarInputFocused()
      )
        return;
    }

    this.stopMoveMode();
    this.setPointClickError(false);

    const { col, row } = getCellElementDimensions(e.target as HTMLElement);

    this.isSelectionChanging = true;

    this.updateSelection({
      updatedSelection: {
        startCol: col,
        startRow: row,
        endCol: col,
        endRow: row,
      },
    });

    this.show();
  };

  /**
   * Handles mouse down event, it should stop extending selection
   * @param e {MouseEvent} mouse event
   */
  protected onMouseUp = (e: MouseEvent) => {
    this.isSelectionChanging = false;

    if (this.isPointClickMode) {
      const targetElement = e.target as HTMLElement;
      if (targetElement.classList.contains(gridDataScrollerClass)) return;

      // handle rare case when click is between cells (on borders) which leads to wrong selection and closing cell editor
      if (this._selection?.startRow === -1 || this._selection?.startCol === -1)
        return;

      this.selectionEvents$.next({
        type: GridSelectionEventType.PointClickSelectValue,
        pointClickSelection: this._selection,
      });
    }
  };

  /**
   * Handles mouse move events, it should extend selection by following cursor
   * @param e
   * @returns
   */
  protected onMouseMove = (e: MouseEvent) => {
    if (
      !this.isSelectionChanging ||
      !this.isTargetCell(e.target) ||
      !this._selection ||
      this.moveParams
    )
      return;

    const { col, row } = getCellElementDimensions(e.target as HTMLElement);

    this.updateSelection({
      updatedSelection: {
        ...this._selection,
        endCol: col,
        endRow: row,
      },
    });
  };

  /**
   * Checks if got event target is a cell of the grid and not resize
   * @param target {EventTarget} specified event target
   * @returns {boolean} is target a cell
   */
  public isTargetCell(target: EventTarget | null): boolean {
    const targetElement = target as HTMLElement;

    if (
      !targetElement ||
      !targetElement.getAttribute('data-row') ||
      !targetElement.getAttribute('data-col') ||
      targetElement.classList.contains(resizeCellTriggerClass)
    )
      return false;

    return true;
  }

  /**
   * When full selection should be moved using external methods or by arrows. Starts it
   * @param hideMoveTooltip {boolean} not in all cases we should show tooltip, for example: in dnd tables
   */
  protected startMoveMode(hideMoveTooltip: boolean) {
    if (this.isPointClickMode) return;

    this.moveParams = { rowDelta: 0, colDelta: 0, hideMoveTooltip };
    this.selectionContainer.classList.add('grid-selection__move');
    if (!hideMoveTooltip) {
      const { currentZoom } = this.dataView;
      this.moveTooltip.style.display = 'flex';

      this.moveTooltip.style.width = getPx(50 * currentZoom);
      this.moveTooltip.style.height = getPx(25 * currentZoom);
      this.moveTooltip.style.padding = `${getPx(4 * currentZoom)} ${getPx(
        6 * currentZoom
      )}`;
      this.moveTooltipText.style.fontSize = getPx(11 * currentZoom);
      this.moveTooltipText.style.lineHeight = getPx(11 * currentZoom);
      this.moveTooltipIcon.style.width = getPx(17 * currentZoom);
      this.moveTooltipIcon.style.marginLeft = getPx(4 * currentZoom);
    }

    this.selectionEvents$.next({ type: GridSelectionEventType.StartMoveMode });
    this.show();
  }

  /**
   * When full selection should be moved using external methods or by arrows. Stops it
   * @param hideMoveTooltip {boolean} not in all cases we should show tooltip, for example: in dnd tables
   */
  protected stopMoveMode() {
    this.moveParams = null;
    this.selectionContainer.classList.remove('grid-selection__move');
    this.moveTooltip.style.display = 'none';
    this.selectionEvents$.next({ type: GridSelectionEventType.StopMoveMode });
  }

  /**
   * Selection should stay within grid bounds
   * @param col {number} specified column
   * @returns {number} limited column if needed
   */
  protected limitCol(col: number): number {
    const [minCol, maxCol] = this.dataView.columnsEdges;

    return Math.max(minCol, Math.min(maxCol + 1, col));
  }

  /**
   * Selection should stay within grid bounds
   * @param col {number} specified row
   * @returns {number} limited row if needed
   */
  protected limitRow(row: number): number {
    const [minRow, maxRow] = this.dataView.edges;

    return Math.max(minRow, Math.min(maxRow + 1, row));
  }

  private getLimitedSelection(selection: GridSelection) {
    const { startCol, startRow, endCol, endRow } = selection;

    return {
      startCol: this.limitCol(Math.min(startCol, endCol)),
      startRow: this.limitRow(Math.min(startRow, endRow)),
      endCol: this.limitCol(Math.max(endCol, startCol) + 1),
      endRow: this.limitRow(Math.max(endRow, startRow) + 1),
    };
  }

  /**
   * Get current selection state
   * @returns {GridSelection | null} Current selection
   */
  public get selection(): GridSelection | null {
    if (!this._selection) return null;

    return this.getLimitedSelection(this._selection);
  }

  /**
   * Increase size of selection to next cell
   * It covered cases when cell is multicell like table header or fields with more than 1 column size
   *
   * @protected
   * @param {(GridSelection | null)} selection
   * @returns {(GridSelection | null)}
   */
  protected normalizeSelection(
    selection: GridSelection | null
  ): GridSelection | null {
    if (!selection) {
      return null;
    }

    let colSelectionDirection: 'right' | 'left' = 'right';
    let rowSelectionDirection: 'top' | 'bottom' = 'bottom';

    if (selection.endCol < selection.startCol) {
      colSelectionDirection = 'left';
    }
    if (selection.endRow < selection.startRow) {
      rowSelectionDirection = 'top';
    }

    const nextXCell = this.api.getNextCell({
      col: selection.endCol,
      row: selection.endRow,
      colDirection: colSelectionDirection,
      rowDirection: undefined,
    });
    const previousXCell = this.api.getNextCell({
      col: selection.startCol,
      row: selection.startRow,
      colDirection: colSelectionDirection === 'left' ? 'right' : 'left',
      rowDirection: undefined,
    });
    const nextYCell = this.api.getNextCell({
      col: selection.endCol,
      row: selection.endRow,
      colDirection: undefined,
      rowDirection: rowSelectionDirection,
    });
    const previousYCell = this.api.getNextCell({
      col: selection.startCol,
      row: selection.startRow,
      colDirection: undefined,
      rowDirection: rowSelectionDirection === 'bottom' ? 'top' : 'bottom',
    });

    return {
      startCol:
        previousXCell.col + (colSelectionDirection === 'right' ? 1 : -1),
      startRow:
        previousYCell.row + (rowSelectionDirection === 'bottom' ? 1 : -1),
      endCol: nextXCell.col + (colSelectionDirection === 'right' ? -1 : 1),
      endRow: nextYCell.row + (rowSelectionDirection === 'bottom' ? -1 : 1),
    };
  }

  private updateSelectionPosition(
    element: HTMLElement,
    selection: GridSelection
  ) {
    const { startCol, endCol, endRow, startRow } = selection;

    const { x: x1, y: y1 } = this.dataView.getCellPosition(startCol, startRow);
    const { x: x2, y: y2 } = this.dataView.getCellPosition(endCol, endRow);

    const width = Math.abs(x1 - x2);
    const height = Math.abs(y1 - y2);

    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);

    element.style.transform = `translate(${x}px, ${y}px)`;
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    element.style.display = width === 0 || height === 0 ? 'none' : 'block';

    this.updateSelectionDataset();
  }

  /**
   * Update selection dataset, for e2e tests to know selection placement on the grid
   */
  private updateSelectionDataset() {
    if (!this.selection) {
      this.selectionContainer.dataset.startCol = '0';
      this.selectionContainer.dataset.startRow = '0';
      this.selectionContainer.dataset.endCol = '0';
      this.selectionContainer.dataset.endRow = '0';

      return;
    }

    const { startCol, startRow, endCol, endRow } = this.selection;

    this.selectionContainer.dataset.startCol = startCol.toString();
    this.selectionContainer.dataset.startRow = startRow.toString();
    this.selectionContainer.dataset.endCol = endCol.toString();
    this.selectionContainer.dataset.endRow = endRow.toString();
  }

  /**
   * Redraw selection and recalculate selection relatively from params
   * @param updatedSelection {GridSelection | null} new selection
   * @param quiet {boolean = false} update selection should be without triggering action in selection$
   * @param key {string | undefined} what key was pressed by triggering specified updateSelection
   * @param withoutNormalization {boolean = false} is normalization of selection should be skipped
   */
  protected updateSelection({
    updatedSelection,
    quiet = false,
    key,
    withoutNormalization = false,
  }: {
    updatedSelection: GridSelection | null;
    quiet?: boolean | undefined;
    key?: string;
    withoutNormalization?: boolean;
  }): void {
    this._selection =
      this.moveParams || withoutNormalization
        ? updatedSelection
        : this.normalizeSelection(updatedSelection);

    if (!this.selection) return;

    this.show();

    this.updateSelectionPosition(this.selectionContainer, this.selection);

    if (key && this._selection && !this.moveParams) {
      moveViewport(
        key,
        this._selection.startCol,
        this._selection.startRow,
        this.dataView.currentZoom
      );
    }

    if (!quiet && !this.isPointClickMode) {
      this.selection$.next(this._selection);
    }
  }

  /**
   * If selection moves outside of viewport -> that method could move viewport until selection will seen in viewport.
   * @param col {number} selection angle column
   * @param row {number} selection angle row
   */
  protected moveViewportToSelection(col: number, row: number) {
    const [startRow, endRow] = this.dataView.edges;
    const [startCol, endCol] = this.dataView.columnsEdges;

    if (col > endCol || row > endRow || row < startRow || col < startCol) {
      this.dataView.makeCellViewportVisible(col, row);
    }
  }

  getSelectedPinnedCols() {
    if (!this._selection) return null;

    return {
      startCol: this._selection?.startCol,
      endCol: this._selection?.endCol,
    };
  }

  /**
   * External update of selection, check useSelectionEvents
   * @param selection {GridSelection | null} new selection
   * @param moveMode {boolean = false} selection in move mode (when we do ctrl + a, we're moving range selection using arrows)
   * @param hideMoveTooltip {boolean = false} not in all cases needed showing tooltip with arrows ("<^>"), for example drag'n'drop tables
   */
  public setSelection(
    selection: GridSelection | null,
    moveMode: boolean | undefined = false,
    hideMoveTooltip: boolean | undefined = false
  ): void {
    if (!selection) {
      this.clear();

      return;
    }

    if (moveMode) {
      this.startMoveMode(hideMoveTooltip);
    } else {
      this.stopMoveMode();
    }

    this.updateSelection({ updatedSelection: selection });
  }

  /**
   * Switches point click mode
   * @param isPointClickMode {boolean} is point click mode
   */
  public switchPointClickMode(isPointClickMode: boolean) {
    this.isPointClickMode = isPointClickMode;

    if (isPointClickMode) {
      this.selectionBackup = {
        selection: this._selection,
        moveParams: this.moveParams,
      };

      this.selectionContainer.classList.remove('grid-selection');
      this.selectionContainer.classList.add('point-click-selection');

      this._selection = null;
      this.moveParams = null;

      this.selectionContainer.style.width = '0px';
      this.selectionContainer.style.height = '0px';
      this.selectionContainer.style.display = 'none';

      return;
    }

    this._selection = this.selectionBackup?.selection || null;
    this.moveParams = this.selectionBackup?.moveParams || null;

    this.selectionContainer.classList.remove('point-click-selection');
    this.selectionContainer.classList.add('grid-selection');

    this.setPointClickError(false);

    this.selectionBackup = null;

    this.updateSelection({ updatedSelection: this._selection });
  }

  /*
   * Set or remove point click error
   */
  public setPointClickError(error: boolean) {
    if (error) {
      this.selectionContainer.classList.add('point-click-selection__error');
    } else {
      this.selectionContainer.classList.remove('point-click-selection__error');
    }
  }

  public showDottedSelection(selection: GridSelection) {
    this._dottedSelection = selection;
    const normalizedSelection = this.normalizeSelection(selection);

    if (normalizedSelection) {
      const limitedSelection = this.getLimitedSelection(normalizedSelection);
      this.dottedSelection.style.position = 'absolute';
      this.updateSelectionPosition(this.dottedSelection, limitedSelection);
    }
  }

  public hideDottedSelection() {
    this.dottedSelection.style.display = 'none';
    this._dottedSelection = null;
  }

  /**
   * Clears selection
   */
  public clear() {
    this.selection$.next(null);
    this._selection = null;
    this.hide();
  }

  /**
   * Hides selection
   */
  public hide() {
    this.selectionContainer.style.display = 'none';
    this.updateSelectionDataset();
  }

  /**
   * Shows selection
   */
  public show() {
    this.selectionContainer.style.display = 'block';
  }

  /**
   * Destroys selection
   */
  public destroy() {
    this.selectionEvents$.unsubscribe();
    this.root.remove();
    super.destroy();
  }

  /**
   * Resets column configuration
   */
  protected reset = () => {
    this.columnStateService.reset();
  };
}
