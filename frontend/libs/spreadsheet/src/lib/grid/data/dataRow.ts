import { inject, injectable } from 'inversify';
import { fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  CONFIG,
  Destroyable,
  EVENTS_SERVICE,
  HTMLDataAttributes,
  ROW_SERVICE,
} from '@deltix/grid-it';
import type {
  GridItOptions,
  IDataCell,
  InitDataRow,
  IRenderDataProps,
} from '@deltix/grid-it-core';
import { appendChild, Column, GridItEvent } from '@deltix/grid-it-core';

import { isTableHeaderCell } from '../../utils';
import { type IEventsService } from '../events';
import { type IRowService } from '../row';
import { GridCell, GridData, IDataCellState, IDataRow, RowData } from './types';

import './dataRow.scss';

type DataRowMetadata = {
  index: number;
};

const noRenderIndex = -1;
const eventMap: Record<string, GridItEvent> = {
  dblclick: GridItEvent.rowDblClick,
  click: GridItEvent.rowClick,
  contextmenu: GridItEvent.contextmenu,
};

@injectable()
export class DataRow extends Destroyable implements IDataRow {
  root: HTMLElement;
  rowData: RowData;
  dataContainer: HTMLElement;

  columns: Column[] = [];

  protected state: IDataCellState[] = [];
  protected buffer: HTMLElement[] = [];

  protected height: number;
  protected index = noRenderIndex;
  protected top = 0;
  protected rafId: number;

  protected firstIndex = 0;
  protected lastIndex = 0;

  protected scrollLeft: number;

  public get edges(): [number, number] {
    return [this.firstIndex, this.lastIndex];
  }

  get canRender() {
    return !!this.rowData && noRenderIndex !== this.index;
  }

  constructor(
    @inject(EVENTS_SERVICE) protected eventsService: IEventsService,
    @inject(CONFIG) protected options: GridItOptions<GridData>,
    @inject(ROW_SERVICE) protected rowService: IRowService
  ) {
    super();

    this.root = document.createElement('div');
    this.root.classList.add('grid-row', 'grid-row--data');

    this.dataContainer = document.createElement('div');
    appendChild(this.root, this.dataContainer);

    this.scrollLeft = 0;
    this.height = 0;

    this.rafId = 0;
    this.rowData = {};

    if (options?.dataRowClassName) {
      this.root.classList.add(options.dataRowClassName);
    }

    Object.entries(eventMap).forEach(([type, emitType]) =>
      fromEvent(this.root, type)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (event) =>
            this.eventsService.emit({
              type: emitType,
              event: this.generateWrappedEvent(event),
            } as any) // todo
        )
    );

    this.rowService.widthNoClones$
      .pipe(takeUntil(this.destroy$))
      .subscribe(this.setWidth);
  }

  init = (data: InitDataRow<RowData>) => {
    const { index, rowData, columns, top } = data;

    this.columns = [...columns];

    this.setIndex(index, top);
    this.setAndProcessMetadata({
      index,
    });
    this.rowData = rowData;
    this.handleColumnsUpdate(columns);
  };

  protected setAndProcessMetadata = (metadata: DataRowMetadata) => {
    const { index } = metadata;
    this.index = index;

    this.processMetadata();
  };

  protected generateWrappedEvent = (event: Event) => ({
    index: this.index,
    target: this.root,
    data: this.rowData,
    event,
  });

  protected setIndexAttribute = () => {
    this.root.setAttribute(HTMLDataAttributes.ROW_INDEX, `${this.index}`);
  };

  protected processMetadata = () => {
    this.setIndexAttribute();
  };

  protected removeAndDestroyCell = (
    cell: IDataCell<GridCell, IRenderDataProps>
  ) => {
    cell.remove();
    cell.destroy?.();
  };

  protected createCell() {
    const cell = document.createElement('div');

    cell.classList.add('grid-cell');

    return cell;
  }

  protected getCellValue(column: number) {
    return this.rowData[column]?.value;
  }

  protected removeCell(cell: HTMLElement) {
    cell.remove();
  }

  protected setWidth = (widthPx: number) => {
    this.root.style.width = `${widthPx}px`;
  };

  protected mapColumns = (columns: Column[]) =>
    new Map(columns.map((column) => [column.id, column]));

  handleColumnsUpdate = (columns: Column[]) => {
    this.columns = [...columns];
    this.manageContainerWidth();
  };

  protected manageContainerWidth = () => {
    if (!this.dataContainer) {
      return;
    }

    this.releaseCellsNext(this.columns.length - 1);
    this.state.length = this.columns.length + 1;
    let left = 0;

    for (let i = 1; i <= this.columns.length; i++) {
      const width = this.columns[i - 1].width;
      if (this.state[i]) {
        this.state[i].left = left;
        this.state[i].width = width;
      } else {
        this.state[i] = {
          left,
          cell: undefined,
          width,
        };
      }
      left += width;
    }

    this.dataContainer.style.height = `${left}px`;
  };

  protected updateCellWidth = (cell: HTMLElement, width: number) => {
    cell.style.width = `${width}px`;
  };

  protected updateCellPosition = (cell: HTMLElement, posX: number) => {
    cell.style.left = `${Math.floor(posX)}px`;
  };

  protected findFirstColumn = (scrollLeft: number) => {
    let currentWidth = 0;

    for (let i = 0; i < this.columns.length; i++) {
      const columnWidth = this.columns[i].width;
      currentWidth += Math.floor(columnWidth);

      if (currentWidth >= scrollLeft) return i + 1;
    }

    return this.columns.length;
  };

  protected findLastColumn(
    firstColumn: number,
    scrollLeft: number,
    rootWidth: number
  ) {
    let lastColumn = firstColumn;
    let w = 0;

    while (lastColumn < this.columns.length && w <= rootWidth) {
      const state = this.state[lastColumn];

      w += Math.floor(
        lastColumn === firstColumn && state.left < scrollLeft
          ? state.width - (scrollLeft - state.left)
          : state.width
      );

      lastColumn++;
    }

    return lastColumn;
  }

  protected releaseCellsPrev(from: number) {
    for (let i = from - 1; i >= this.firstIndex; i--) {
      this.release(i);
    }
  }

  protected releaseCellsNext(from: number) {
    for (let i = from + 1; i <= this.lastIndex; i++) {
      this.release(i);
    }
  }

  protected release(index: number) {
    const item = this.state[index];

    if (!item) return;

    const cell = item.cell;

    if (cell) {
      this.buffer.push(cell);

      this.removeCell(cell);
      item.cell = undefined;
    }
  }

  protected acquire() {
    const cell: HTMLElement =
      this.buffer.length > 0
        ? this.buffer.pop() ?? this.createCell()
        : this.createCell();

    this.dataContainer.appendChild(cell);

    return cell;
  }

  protected getCellWidth = (
    isTableHeader: boolean,
    cellData: GridCell,
    firstColumn: number,
    stateWidth: number
  ): number => {
    if (!isTableHeader || !cellData.table) return Math.floor(stateWidth);

    const { startCol, endCol } = cellData.table;
    const isFirstHeaderColVisible = startCol >= firstColumn;
    let headerVisibleCols = endCol - startCol + 1;

    if (!isFirstHeaderColVisible) {
      headerVisibleCols -= Math.abs(startCol - firstColumn);
    }

    const firstVisibleHeaderCol = endCol - headerVisibleCols + 1;

    return firstVisibleHeaderCol !== cellData.col
      ? 0
      : this.getCellX(endCol + 1) - this.getCellX(firstVisibleHeaderCol);
  };

  public getCellX(col: number) {
    let x = -this.scrollLeft;

    for (let i = 1; i < col; ++i) {
      x += this.columns[i - 1].width;
    }

    return Math.floor(x);
  }

  handleDataUpdate = (data: RowData, scrollLeft: number, rootWidth: number) => {
    if (!this.columns.length) return;

    this.rowData = data;

    const firstColumn = this.findFirstColumn(scrollLeft);

    this.releaseCellsPrev(firstColumn);

    const lastColumn = this.findLastColumn(firstColumn, scrollLeft, rootWidth);

    this.releaseCellsNext(lastColumn);

    cancelAnimationFrame(this.rafId);

    this.rafId = requestAnimationFrame(() => {
      let i = firstColumn;

      while (i <= lastColumn && this?.state?.[i]) {
        const state = this.state[i];
        const cellData: GridCell = this.columns[i - 1].getValue(
          this.rowData
        ) || {
          col: i,
          row: this.index,
        };

        const isTableHeader = isTableHeaderCell(cellData);
        const width = this.getCellWidth(
          isTableHeader,
          cellData,
          firstColumn,
          state.width
        );

        if (!state.cell) {
          state.cell = this.acquire();
        }

        const element: HTMLElement = this.columns[i - 1].render({
          index: this.index,
          rowData: this.rowData,
          element: this.dataContainer,
          id: this.columns[i - 1].id,
          zoom: this.rowService.getZoom(),
          height: this.height,
          cellData,
          width,
        } as any) as HTMLElement;

        state.cell.innerHTML = element.outerHTML;

        this.updateCellPosition(state.cell, state.left);
        this.updateCellWidth(state.cell, Math.floor(state.width));

        i++;
      }
    });

    this.firstIndex = firstColumn;
    this.lastIndex = lastColumn;
  };

  render = () => this.root;

  remove = () => this.root.remove();

  setHeight(height: number) {
    this.height = height;
    this.root.style.height = `${height}px`;
  }

  setIndex(index: number, top: number) {
    this.index = index;
    this.root.style.transform = `translateY(${top}px)`;
    this.top = top;
    this.setIndexAttribute();
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    super.destroy();
    this.root.remove();
  }
}
