import { inject, injectable, optional } from 'inversify';
import { concat, fromEvent, Subject, Subscription } from 'rxjs';
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
  IHeader,
  IRowService,
  ITabs,
} from '@deltix/grid-it-core';
import {
  appendChild,
  Column,
  createElement,
  DEFAULT_ROW_HEIGHT,
} from '@deltix/grid-it-core';

import { updateChartsViewport } from '../../components';
import { gridDataContainerClass } from '../../constants';
import { defaults } from '../../defaults';
import { getPx } from '../../utils';
import {
  GridData,
  IDataRow,
  type IDataService,
  IDataViewState,
  IRowNumberResize,
  IScroll,
} from './types';

const columnUpdateDebounceMs = 80;
const maxRows = 100000;
const dataUpdateTime = 50;

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

  public get edges(): [number, number] {
    return [this.firstIndex, this.lastIndex];
  }

  public get columnsEdges(): [number, number] {
    return [this.columnFirstIndex, this.columnLastIndex];
  }

  public get currentZoom() {
    return this.zoom;
  }

  public getColumns() {
    return this.columns;
  }

  public emitRowNumberResize(width: number) {
    this.rowNumberResize.next({ width });
    this.root.style.marginLeft = getPx(width);
  }

  public getCellByCoords(x: number, y: number) {
    return {
      col: this.findFirstColumn(x),
      row: this.findFirstRow(y) - 1,
    };
  }

  public getCellPosition(col: number, row: number) {
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
  get gotNext() {
    return !!this.data[this.lastIndex + 1];
  }

  get scroll$() {
    return this.scroll.asObservable();
  }

  get rowNumberResize$() {
    return this.rowNumberResize.asObservable();
  }

  protected get containerHeight() {
    return this.dataContainer?.clientHeight || 0;
  }

  protected get rootHeight() {
    return this.root?.clientHeight || 0;
  }

  protected get rootWidth() {
    return this.root?.clientWidth || 0;
  }

  protected get scrollTop() {
    return this.root?.scrollTop || 0;
  }

  protected get scrollLeft() {
    return this.root?.scrollLeft || 0;
  }

  protected get scrollHeight() {
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
    this.root = createElement('div', { classList: ['grid-data-scroller'] });

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
      .pipe(takeUntil(this.destroy$))
      .subscribe(this.scheduleUpdate);

    this.resizeSub = resizeObservable(this.root).subscribe(() => {
      this.renderRows();
    });
  }

  protected scheduleUpdate = () => {
    this.renderRows();
    this.emitScroll();
    updateChartsViewport(this.root, this.dataContainer);
  };

  protected handleColumnsUpdate = (columns: Column[]) => {
    this.columns = columns;

    for (const row of this.rows) {
      row.handleColumnsUpdate(columns);
    }

    this.renderRows();
  };

  protected updateContainerHeight = (onBeforeScroll?: () => void) => {
    if (!this.dataContainer) {
      return;
    }

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

    const oldHeight = this.containerHeight;
    const newHeight = top;

    this.dataContainer.style.height = `${Math.floor(newHeight * this.zoom)}px`;

    onBeforeScroll?.();

    if (oldHeight !== newHeight) {
      this.emitScroll();
    }
  };

  makeCellViewportVisible(col: number, row: number) {
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

    this.root.scrollTo(scrollLeft, scrollTop);
  }

  public setData = (data: GridData) => {
    this.data = data;
    this.refresh();
  };

  public setLoading = (isLoading: boolean) => {
    this.loading = isLoading;
  };

  public render = () => this.root;

  public getState(index: number) {
    if (!(index in this.state)) return { top: 0, height: 0 };

    return this.state[index];
  }

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

  protected handleDataRowHeightUpdate = (updatedHeight: number) => {
    // TODO: Support custom row heights
    this.rowHeight = defaults.cell.height;
    this.refresh();
  };

  protected refresh = () => {
    this.updateContainerHeight();
    this.renderRows();
  };

  protected releaseRowsPrev(from: number) {
    for (let i = from - 1; i >= this.firstIndex; i--) {
      this.release(i);
    }
  }

  protected releaseRowsNext(from: number) {
    for (let i = from + 1; i <= this.lastIndex; i++) {
      this.release(i);
    }
  }

  protected release(index: number) {
    const item = this.state[index];

    if (!item) return;

    if (item.row) {
      this.buffer.push(item.row);

      item.row.remove();
      item.row = void 0;
    }
  }

  protected acquire() {
    const row: IDataRow =
      this.buffer.length > 0
        ? this.buffer.pop() ?? this.dataRowFactory()
        : this.dataRowFactory();

    this.dataContainer.appendChild(row.render());

    row.handleColumnsUpdate(this.columns);

    this.rows.push(row);

    return row;
  }

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
        i++;
      }
    });

    this.firstIndex = first;
    this.lastIndex = last;
  };

  protected emitScroll() {
    this.scroll.next({
      scrollHeight: this.scrollHeight,
      scrollTop: this.scrollTop,
    });
  }

  public getRowHeight(_: number) {
    // TODO: Support custom row heights
    return this.rowHeight;
  }

  public setZoom(zoom: number) {
    this.zoom = zoom;
    this.renderRows();
  }

  // Find row that comes after the Y coordinate
  protected findFirstRow(y: number) {
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

  protected findLastRow(firstRow: number, scrollTop: number) {
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

  // Find column that comes after the X coordinate
  protected findFirstColumn(x: number) {
    let col = 1;
    let left = 0;

    for (let i = 1; i <= this.columns.length; ++i) {
      left += this.columns[i].width * this.zoom;

      if (left >= x) {
        col = i;
        break;
      }
    }

    return col;
  }
}
