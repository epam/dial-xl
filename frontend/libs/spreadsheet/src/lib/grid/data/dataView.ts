import { inject, injectable, optional } from 'inversify';
import { concat, fromEvent, Observable, Subject, Subscription } from 'rxjs';
import { debounceTime, take, takeUntil } from 'rxjs/operators';

import {
  COLUMN_SERVICE,
  CONFIG,
  DATA_ROW_FACTORY,
  DATA_SERVICE,
  Destroyable,
  HEADER,
  resizeObservable,
  ROW_SERVICE,
  TABS,
} from '@deltix/grid-it';
import type {
  GridItOptions,
  IColumnService,
  IGui,
  IRowService,
  ITabs,
} from '@deltix/grid-it-core';
import {
  appendChild,
  Column,
  createElement,
  DEFAULT_ROW_HEIGHT,
} from '@deltix/grid-it-core';
import { GridData, gridDataScrollerClass } from '@frontend/common';

import {
  updateAIPromptViewport,
  updateCellEditorViewport,
  updateChartsViewport,
} from '../../components';
import { gridDataContainerClass } from '../../constants';
import { defaults } from '../../defaults';
import { getPx } from '../../utils';
import { type IHeader } from '../header';
import {
  IDataRow,
  type IDataService,
  IDataViewState,
  IRowNumberResize,
  IScroll,
} from './types';

const columnUpdateDebounceMs = 80;
const scrollUpdateDebounceMs = 20;
const maxRows = 100000;
const dataUpdateTime = 50;

/**
 * !!!MAIN SERVICE!!! that responsible for rendering rows (contains scroll handling, virtualization, position calculating, etc)
 * @property {Subject<IScroll>} scroll - subject which triggers when scroll happens
 * @property {Subject<IRowNumberResize>} scroll - subject which triggers when resize happens
 * @property {HTMLElement} root - main html container of dataView elements
 * @property {HTMLElement} dataContainer - big container by height which creates native scrolling effect extending root
 * @property {Column[]} columns - internal copy of columns configuration [LEGACY] should be infinite array
 * @property {Subscription} resizeSub - subscription to resize of columns, to rerender rows if it's needed
 * @property {boolean} loading - loading state, needed to showing loader or other action
 * @property {number} firstIndex - first visible row index in viewport, recalculated in renderRows()
 * @property {number} lastIndex - last visible row index in viewport, recalculated in renderRows()
 * @property {number} columnFirstIndex - first visible column index in viewport, recalculated in renderRows()
 * @property {number} columnLastIndex - last visible column index in viewport, recalculated in renderRows()
 * @property {number} zoom - zoom value from host application, needed in position calculating and right sizing in rendering
 * @property {number} rowHeight - row height [LEGACY], now we don't support custom row height it's always DEFAULT_ROW_HEIGHT
 * @property {GridData} data - after dataService triggers new data update we store it in this.data to provide to rows
 * @property {IDataRow[]} rows - rows that currently were rendered and placed into the data container, contain reference to create DataRow
 * @property {IDataViewState[]} state -
 * all rows movement happens because of the native scrolling root container,
 * state allocate a lot of rows with precalculated position top: 0, top: 20, top: 40, ...,
 * after scrolling in renderRows() from state indexes < firstIndex, rows will be placed to buffer
 * same with state indexes > lastIndex
 * to firstIndex < index < lastIndex, will be placed new rows.
 * state needed to convenient rows allocation and handling. check renderRows()
 * (part of virtualization)
 * @property {IDataRow[]} buffer - buffer of removed from container rows by scrolling (part of virtualization)
 * @property {number} rafId - id of last requested animation frame (part of rendering)
 */
@injectable()
export class DataView extends Destroyable implements IGui {
  protected scroll = new Subject<IScroll>();
  protected rowNumberResize = new Subject<IRowNumberResize>();

  protected root: HTMLElement; // this is limited in size and has a scrollbar
  protected dataContainer: HTMLElement; // this expands inside of root

  protected columns: Column[] = [];
  protected resizeSub: Subscription;
  protected loading = false;

  protected firstIndex = 0;
  protected lastIndex = 0;

  protected columnFirstIndex = 0;
  protected columnLastIndex = 0;

  protected zoom: number;

  protected rowHeight = DEFAULT_ROW_HEIGHT;

  protected data: GridData = {};
  protected buffer: IDataRow[] = [];
  protected rows: IDataRow[] = [];
  protected state: IDataViewState[] = [];
  protected rafId: number;

  protected maxContainerHeight: number | undefined;
  protected maxContainerWidth: number | undefined;

  /**
   * Getter for first and last visible row in viewport
   * @returns {[number, number]} [firstVisibleRow, lastVisibleRow]
   */
  public get edges(): [number, number] {
    return [this.firstIndex, this.lastIndex];
  }

  /**
   * Getter for first and last visible column in viewport
   * @returns {[number, number]} [firstVisibleColumn, lastVisibleColumn]
   */
  public get columnsEdges(): [number, number] {
    return [this.columnFirstIndex, this.columnLastIndex];
  }

  /**
   * Getter for zoom in dataView
   * @returns {number} Zoom
   */
  public get currentZoom(): number {
    return this.zoom;
  }

  /**
   * Gets columns configuration in dataView [LEGACY] Spreadsheet shouldn't have columns configuration, it should be infinite
   * @returns {Column[]} columns configuration
   */
  public getColumns(): Column[] {
    return this.columns;
  }

  /**
   * Triggers resizing of row number, in cases when number become big do display in previous container
   * @param width {number} width that row number column should be
   */
  public emitRowNumberResize(width: number): void {
    this.rowNumberResize.next({ width });
    this.root.style.marginLeft = getPx(width);
  }

  /**
   * Return cell(col, row) of given x, y coordinates, opposite of getCellPosition
   * @param x {number} x coordinate
   * @param y {number} y coordinate
   * @returns {col: number, row: number} column and row of cell by given coordinates
   */
  public getCellByCoords(x: number, y: number): { col: number; row: number } {
    return {
      col: this.findFirstColumn(x),
      row: this.findFirstRow(y) - 1,
    };
  }

  /**
   * Returns cell position relative to viewport
   * @param col {number} grid column
   * @param row {number} grid row
   * @returns {x: number, y: number} position of given cell
   */
  public getCellPosition(col: number, row: number): { x: number; y: number } {
    const { rows: maxRows } = defaults.viewport;
    if (!(row in this.state) && row !== maxRows + 1) {
      return {
        x: 0,
        y: 0,
      };
    }

    let x = 0;
    for (let i = 1; i < col; ++i) {
      x += this.columns[i - 1].width;
    }

    let y = 0;

    if (row === maxRows + 1) {
      y = Math.floor(
        (this.state[row - 1].top + this.state[row - 1].height * 2) * this.zoom -
          this.scrollTop
      );
    } else {
      y = Math.floor(
        (this.state[row].top + this.state[row].height) * this.zoom -
          this.scrollTop
      );
    }

    return {
      x: Math.floor(x - this.scrollLeft),
      y,
    };
  }

  /**
   * Getter for observable which trigger action every time when scroll changes
   * @returns {Observable<IScroll>} Scroll observable
   */
  get scroll$(): Observable<IScroll> {
    return this.scroll.asObservable();
  }

  /**
   * Getter for observable which trigger action every time when rowNumber column resized (in width, when row number getting bigger)
   * @returns {Observable<IRowNumberResize>} RowNumberResize observable
   */
  get rowNumberResize$(): Observable<IRowNumberResize> {
    return this.rowNumberResize.asObservable();
  }

  /**
   * Getter for data container height
   * @returns {number} data container height
   */
  protected get containerHeight(): number {
    return this.dataContainer?.clientHeight || 0;
  }

  /**
   * Getter for data container width
   * @returns {number} root container width
   */
  protected get containerWidth(): number {
    return this.dataContainer?.clientWidth || 0;
  }

  /**
   * Getter for root container height
   * @returns {number} root container height
   */
  protected get rootHeight(): number {
    return this.root?.clientHeight || 0;
  }

  /**
   * Getter for root container width
   * @returns {number} root container width
   */
  protected get rootWidth(): number {
    return this.root?.clientWidth || 0;
  }

  /**
   * Getter for number of pixels currentContainer were scrolled vertically
   * @returns {number} scroll top
   */
  protected get scrollTop(): number {
    return this.root?.scrollTop || 0;
  }

  /**
   * Getter for number of pixels currentContainer were scrolled horizontally
   * @returns {number} scroll left
   */
  protected get scrollLeft(): number {
    return this.root?.scrollLeft || 0;
  }

  /**
   * Getter for scroll size
   * @returns {number} scroll size
   */
  protected get scrollHeight(): number {
    return this.dataContainer?.scrollHeight || 0;
  }

  constructor(
    @inject(DATA_SERVICE) protected dataService: IDataService,
    @inject(DATA_ROW_FACTORY) protected dataRowFactory: () => IDataRow,
    @optional() @inject(TABS) protected tabs: ITabs,
    @inject(HEADER) protected header: IHeader,
    @inject(COLUMN_SERVICE) protected columnService: IColumnService,
    @inject(CONFIG) protected config: GridItOptions<GridData>,
    @inject(ROW_SERVICE) protected rowService: IRowService
  ) {
    super();

    this.rafId = 0;
    this.root = createElement('div', { classList: [gridDataScrollerClass] });

    this.zoom = 1;

    const headerElement = this.header.render();
    this.root.appendChild(headerElement);

    if (this.tabs) {
      this.root.appendChild(this.tabs.render());
    }

    this.dataContainer = createElement('div', {
      classList: [gridDataContainerClass],
    });

    this.rowService.dataRowHeight$
      .pipe(takeUntil(this.destroy$))
      .subscribe(this.handleDataRowHeightUpdate);

    this.rowService.forceDataRowHeightUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refresh());

    this.dataService.data$
      .pipe(takeUntil(this.destroy$), debounceTime(dataUpdateTime))
      .subscribe((data) => {
        this.setData(data);
        this.renderRows();
      });

    appendChild(this.root, [this.dataContainer]);

    concat(
      this.columnService.flat$.pipe(take(1)),
      this.columnService.flat$.pipe(
        debounceTime(columnUpdateDebounceMs) // this filters out lots of events on column resize
      )
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe(this.handleColumnsUpdate);

    fromEvent(this.root, 'scroll', { passive: true })
      .pipe(takeUntil(this.destroy$), debounceTime(scrollUpdateDebounceMs))
      .subscribe(this.scheduleUpdate);

    fromEvent(this.root, 'scrollend', { passive: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateContainerHeight({ scrollEnd: true });
        this.updateContainerWidth({ scrollEnd: true });
      });

    // every time that root resized, triggering renderRows()
    this.resizeSub = resizeObservable(this.root).subscribe(() => {
      this.renderRows();
    });
  }

  /**
   * Triggers renderRows() and emits scroll event + updates viewport of charts (last one is LEGACY, because if we put charts into the dataContainer charts will be scrolled natively)
   */
  protected scheduleUpdate = (): void => {
    this.updateContainerHeight();
    this.renderRows();
    this.emitScroll();
    updateChartsViewport(this.root, this.dataContainer);
    updateCellEditorViewport(this.root);
    updateAIPromptViewport(this.root);
  };

  /**
   * If columns configuration will be updated (for example: changing width of column), every row should get new columns configuration, after rows got new configuration we're triggering main rendering flow
   * @param columns {Column[]} New column configuration
   */
  protected handleColumnsUpdate = (columns: Column[]) => {
    this.columns = columns;

    for (const row of this.rows) {
      row.handleColumnsUpdate(columns);
    }

    // main rendering flow
    this.renderRows();
  };

  /**
   * LEGACY, setting up the dataContainer height to have possibility to scroll it, previously it was calculated using current data size
   * @param requiredScroll {number} ScrollTop which will used as current scrollTop of container
   * @param scrollEnd {number} Indication that scrollend trigger this update
   */
  protected updateContainerHeight = ({
    requiredScroll,
    scrollEnd,
  }: {
    requiredScroll?: number;
    scrollEnd?: boolean;
  } = {}): void => {
    if (!this.dataContainer) {
      return;
    }

    if (!this.maxContainerHeight) {
      this.state.length = maxRows + 1;
      let top = 0;

      for (let i = 1; i <= maxRows; i++) {
        const height = this.getRowHeight(i);
        if (this.state[i]) {
          this.state[i].top = top;
          this.state[i].height = height;
        } else {
          this.state[i] = {
            top,
            row: undefined,
            height,
          };
        }
        top += height;
      }

      this.maxContainerHeight = top;
    }

    const heightResizeThreshold = 300;
    const heightResizeDiff = 600;
    const requiredHeight = this.getScrollChanges(
      requiredScroll,
      heightResizeDiff,
      heightResizeThreshold,
      {
        containerAxisValue: this.containerHeight,
        scrollValue: this.scrollTop,
        rootAxisValue: this.rootHeight,
      },
      scrollEnd
    );

    const newHeight = Math.min(requiredHeight, this.maxContainerHeight!);

    if (this.containerHeight !== newHeight) {
      this.dataContainer.style.height = `${Math.floor(
        newHeight * this.zoom
      )}px`;

      this.emitScroll();
    }
  };

  /**
   * LEGACY, setting up the dataContainer height to have possibility to scroll it, previously it was calculated using current data size
   * @param requiredScroll {number} ScrollTop which will used as current scrollTop of container
   * @param scrollEnd {number} Indication that scrollend trigger this update
   */
  protected updateContainerWidth = ({
    requiredScroll,
    scrollEnd,
  }: {
    requiredScroll?: number;
    scrollEnd?: boolean;
  } = {}): void => {
    if (!this.dataContainer) {
      return;
    }

    const widthResizeThreshold = 300;
    const widthResizeDiff = 600;

    const requiredWidth = this.getScrollChanges(
      requiredScroll,
      widthResizeDiff,
      widthResizeThreshold,
      {
        containerAxisValue: this.containerWidth,
        scrollValue: this.scrollLeft,
        rootAxisValue: this.rootWidth,
      },
      scrollEnd
    );

    const newWidth = Math.min(requiredWidth, this.maxContainerWidth!);

    if (this.containerWidth !== newWidth) {
      this.dataContainer.style.width = `${Math.floor(newWidth * this.zoom)}px`;

      this.emitScroll();
    }
  };

  private getScrollChanges(
    requiredScroll: number | undefined,
    resizeDiff: number,
    resizeThreshold: number,
    {
      containerAxisValue,
      scrollValue,
      rootAxisValue,
    }: {
      containerAxisValue: number;
      scrollValue: number;
      rootAxisValue: number;
    },
    scrollEnd?: boolean
  ) {
    const currentScrollValue = requiredScroll ?? scrollValue;
    const currentScrollSizeLeft =
      containerAxisValue - rootAxisValue - currentScrollValue;
    const scrollBottom = rootAxisValue + currentScrollValue;
    const axisResizeRequiredToIncrease =
      (Math.floor(scrollBottom / resizeDiff) + 1) * resizeDiff;

    const requiredAxisSize =
      currentScrollSizeLeft < resizeThreshold ||
      (currentScrollSizeLeft > resizeDiff && scrollEnd)
        ? axisResizeRequiredToIncrease
        : containerAxisValue;

    return requiredAxisSize;
  }

  /**
   * Reset grid scroll to position 0, 0; needed in cases of sheet changing - we should reset viewport
   */
  public clearViewportScroll(): void {
    this.root.scrollTo(0, 0);
  }

  /**
   * Scrolls root until cell with specified column and row will seen
   * @param col {number} specified column of the cell
   * @param row {number} specified row of the cell
   */
  public makeCellViewportVisible(col: number, row: number) {
    const [startRow, endRow] = this.edges;
    const [startCol, endCol] = this.columnsEdges;

    let diffCol = 0;
    let diffRow = 0;

    const cellsAround = 4;
    const rowOffset = 20;

    if (col > endCol - cellsAround) {
      diffCol = col - (endCol - cellsAround);
    }

    // -2, because columnEdges has 2 extra columns after viewport
    if (col < startCol + cellsAround - 2) {
      diffCol = col - (startCol + cellsAround - 2);
    }

    if (row > endRow - cellsAround) {
      diffRow = row - (endRow - cellsAround);
    }

    if (row < startRow + cellsAround) {
      diffRow = row - (startRow + cellsAround);
    }

    const newCol = Math.max(1, startCol + diffCol);
    const newRow = Math.max(1, startRow + diffRow);

    const { x, y } = this.getCellPosition(newCol, newRow);

    const scrollLeft =
      diffCol === 0 ? this.root.scrollLeft : x + this.root.scrollLeft;
    const scrollTop =
      diffRow === 0 ? this.root.scrollTop : y + this.root.scrollTop - rowOffset;

    this.updateContainerHeight({ requiredScroll: scrollTop, scrollEnd: true });
    this.updateContainerWidth({ requiredScroll: scrollLeft, scrollEnd: true });

    this.root.scrollTo(scrollLeft, scrollTop);
  }

  /**
   * Updating internal copy of the data in DataView
   * @param data {GridData} new data
   */
  public setData = (data: GridData) => {
    this.data = data;
    this.refresh();
  };

  /**
   * Update the loading state
   * @param isLoading {boolean} new loading state
   */
  public setLoading = (isLoading: boolean) => {
    this.loading = isLoading;
  };

  /**
   * Method that renders current service
   * @returns {HTMLElement} html container
   */
  public render = (): HTMLElement => this.root;

  /**
   * Get state by specified index
   * @param index {number} specified index
   * @returns {IDataViewState} state by specified index
   */
  public getState(index: number): IDataViewState {
    if (!(index in this.state)) return { top: 0, height: 0, row: undefined };

    return this.state[index];
  }

  /**
   * Destroys dataView, removes html elements from container, unsubscribing from everything
   */
  destroy() {
    cancelAnimationFrame(this.rafId);

    this.resizeSub?.unsubscribe();
    this.scroll.complete();

    for (const row of this.rows) row.destroy?.();

    this.rows.length = 0;
    this.buffer.length = 0;
    this.state.length = 0;

    super.destroy();

    this.root.remove();
  }

  /**
   * LEGACY, we don't support custom row heights
   * @param updatedHeight {number} new row height
   */
  protected handleDataRowHeightUpdate = (updatedHeight: number): void => {
    // TODO: Support custom row heights
    this.rowHeight = defaults.cell.height;
    this.refresh();
  };

  /**
   * Rerender when it's necessary, without emitting events.
   */
  protected refresh = () => {
    this.updateContainerHeight();
    this.renderRows();
  };

  /**
   * Putting into buffer elements from "from - 1" to "this.firstIndex". After release elements from buffer will be distributed in positions this.firstIndex...this.lastIndex
   * @param from {number} starting from number
   */
  protected releaseRowsPrev(from: number) {
    for (let i = from - 1; i >= this.firstIndex; i--) {
      this.release(i);
    }
  }

  /**
   * Putting into buffer elements from "from + 1" to "this.lastIndex". After release elements from buffer will be distributed in positions this.firstIndex...this.lastIndex
   * @param from {number} starting from number
   */
  protected releaseRowsNext(from: number) {
    for (let i = from + 1; i <= this.lastIndex; i++) {
      this.release(i);
    }
  }
  /**
   * Putting row in state[index] into buffer and removes from container
   * @param index {number} specified index
   */
  protected release(index: number): void {
    const item = this.state[index];

    if (!item) return;

    if (item.row) {
      this.buffer.push(item.row);

      item.row.remove();
      item.row = void 0;
    }
  }

  /**
   * If buffer is not empty, take the row from the buffer, else getting row from the factory
   * @returns {IDataRow} rendered, updated, newly minted row
   */
  protected acquire(): IDataRow {
    const row: IDataRow =
      this.buffer.length > 0
        ? this.buffer.pop() ?? this.dataRowFactory()
        : this.dataRowFactory();

    this.dataContainer.appendChild(row.render());

    row.handleColumnsUpdate(this.columns);

    this.rows.push(row);

    return row;
  }

  /**
   * Main rendering flow.
   * all rows movement happens because of the native scrolling root container,
   * state allocate a lot of rows with precalculated position top: 0, top: 20, top: 40, ...,
   * after scrolling in renderRows() from state indexes < firstIndex, rows will be placed to buffer
   * same with state indexes > lastIndex
   * to firstIndex < index < lastIndex, will be placed new rows.
   * for every new allocated row triggering handleDataUpdate.
   */
  protected renderRows = () => {
    if (!this.root) return;

    const first = this.findFirstRow(this.scrollTop);

    this.releaseRowsPrev(first);

    const last = this.findLastRow(first, this.scrollTop);

    this.releaseRowsNext(last);

    cancelAnimationFrame(this.rafId);

    this.rafId = requestAnimationFrame(() => {
      let i = first;
      while (i <= last && this?.state?.[i]) {
        const state = this.state[i];

        if (!state.row) {
          state.row = this.acquire();
        }

        state.row.setIndex(i, Math.floor(state.top * this.zoom));
        state.row.setHeight(Math.floor(this.state[i].height * this.zoom));
        state.row.handleDataUpdate(
          this.data[i],
          this.scrollLeft,
          this.rootWidth
        );
        const [start, end] = state.row.edges;
        this.columnFirstIndex = start;
        this.columnLastIndex = end;
        this.maxContainerWidth = Math.max(
          state.row.width,
          this.maxContainerWidth ?? 0
        );
        i++;
      }

      this.updateContainerWidth();
      this.header.rerender(this.columnFirstIndex, this.columnLastIndex);
    });

    this.firstIndex = first;
    this.lastIndex = last;
  };

  /**
   * Triggers scroll event
   */
  protected emitScroll(): void {
    this.scroll.next({
      scrollHeight: this.scrollHeight,
      scrollTop: this.scrollTop,
    });
  }

  /**
   * Getting row height by number [LEGACY]
   * @param _ {number} number of row
   * @returns {number} height of given row number
   */
  public getRowHeight(_: number): number {
    // TODO: Support custom row heights
    return this.rowHeight;
  }

  /**
   * Update zoom and triggers rerendering
   * @param zoom {zoom} grid zoom
   */
  public setZoom(zoom: number) {
    this.zoom = zoom;
    this.renderRows();
  }

  /**
   * Find first row that comes after the Y coordinate, first visible row, using binary search
   * @param y {number} vertical coordinate
   * @returns {number} first row
   */
  protected findFirstRow(y: number): number {
    if (y === 0) return 1;

    const { rows: maxRows } = defaults.viewport;
    let start = 1;
    let end = maxRows;

    while (start !== end) {
      const middle = Math.floor((end - start) / 2 + start);

      if (
        this.state[middle].top * this.zoom <= y &&
        this.state[middle + 1].top * this.zoom > y
      ) {
        return middle;
      }

      if (middle === start) {
        return end;
      } else {
        if (this.state[middle].top * this.zoom <= y) {
          start = middle;
        } else {
          end = middle;
        }
      }
    }

    return maxRows;
  }

  /**
   * Find last row in viewport relatively first found row, without binary search because in viewport can be maximum ~40 rows, it's acceptable to not overload the code
   * @param y {number} vertical coordinate
   * @returns {number} last row
   */
  protected findLastRow(firstRow: number, scrollTop: number): number {
    let last = firstRow;
    let h = 0;

    while (last <= maxRows && h <= this.rootHeight) {
      const state = this.state[last];

      h += Math.floor(
        (last === firstRow && state.top < scrollTop
          ? state.height - (scrollTop - state.top)
          : state.height) * this.zoom
      );

      last++;
    }

    return last;
  }

  /**
   * Find first column that comes after the X coordinate, first visible column
   * @param x {number} horizontal coordinate
   * @returns {number} first column
   */
  protected findFirstColumn(x: number): number {
    let col = 1;
    let left = 0;

    for (let i = 0; i <= this.columns.length; ++i) {
      left += this.columns[i]?.width ?? defaults.cell.width;

      if (left >= x) {
        col = i + 1;
        break;
      }
    }

    return col;
  }
}
