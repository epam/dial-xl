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
import type { GridItOptions, InitDataRow } from '@deltix/grid-it-core';
import { appendChild, Column, GridItEvent } from '@deltix/grid-it-core';
import { GridCell, GridData, RowData } from '@frontend/common';

import { gridCellClass, gridRowDataContainerClass } from '../../constants';
import { type IEventsService } from '../events';
import { type IRowService } from '../row';
import { IDataCellState, IDataRow } from './types';

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

/**
 * Represents one row with which DataView operates, in container dataRow initializes like a factory, by scrolling DataView creates or operates with existing DataRows
 * @property {HTMLElement} root - main html container of dataRow elements
 * @property {HTMLElement} dataContainer - big container by width which creates native scrolling effect extending root
 * @property {RowData} rowData - part of all data specifically by this row
 * @property {Column[]} columns - internal copy of columns configuration [LEGACY] should be infinite array
 * @property {IDataCellState} state -
 * all rows movement happens because of the native scrolling root container,
 * state allocate a lot of cells with precalculated position left: 0, left: 60, left: 120, ...,
 * after scrolling in handleDataUpdate() from state indexes < firstIndex, columns will be placed to buffer
 * same with state indexes > lastIndex
 * to firstIndex < index < lastIndex, will be placed new cells.
 * state needed to convenient cells allocation and handling. check handleDataUpdate
 * (part of virtualization)
 * @property {IDataRow[]} buffer - buffer of removed from container cells by scrolling (part of virtualization)
 * @property {number} height - height of this row
 * @property {number} index - index of this row according DataView state
 * @property {number} top - absolute top position relatively DataView dataContainer
 * @property {number} rafId - id of last requested animation frame (part of rendering)
 * @property {number} firstIndex - first visible column index in viewport
 * @property {number} lastIndex - last visible column index in viewport
 * @property {number} scrollLeft - scrollLeft of DataView root container
 */
@injectable()
export class DataRow extends Destroyable implements IDataRow {
  root: HTMLElement;
  rowData: RowData;
  dataContainer: HTMLElement;

  columns: Column[] = [];

  protected state: IDataCellState[] = [];
  protected buffer: HTMLElement[] = [];

  public height: number;
  public width: number;
  protected index = noRenderIndex;
  protected top = 0;

  protected firstIndex = 0;
  protected lastIndex = 0;

  protected scrollLeft: number;

  /**
   * Getter for first and last visible column in viewport
   * @returns {[number, number]} [firstVisibleColumn, lastVisibleColumn]
   */
  public get edges(): [number, number] {
    return [this.firstIndex, this.lastIndex];
  }

  /**
   * Returns can row be rendered
   * @returns {boolean} canRender
   */
  public get canRender(): boolean {
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
    this.dataContainer.classList.add(gridRowDataContainerClass);
    appendChild(this.root, this.dataContainer);

    this.scrollLeft = 0;
    this.height = 0;
    this.width = 0;

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
  }

  /**
   * Initializes the row metadata, triggering update of column configuration
   * @param data {InitDataRow<RowData>} Initial data row configuration
   */
  public init = (data: InitDataRow<RowData>) => {
    const { index, rowData, columns, top } = data;

    this.columns = [...columns];

    this.setIndex(index, top);
    this.setAndProcessMetadata({
      index,
    });
    this.rowData = rowData;
    this.handleColumnsUpdate(columns);
  };

  /**
   * Method where specified params of rows should affect on row behavior (now it's only setting index attribute)
   * @param metadata {DataRowMetadata} DataRow meta data
   */
  protected setAndProcessMetadata = (metadata: DataRowMetadata) => {
    const { index } = metadata;
    this.index = index;

    this.processMetadata();
  };

  /**
   * Generate events in the right format
   * @param event {Event} event
   */
  protected generateWrappedEvent = (event: Event) => ({
    index: this.index,
    target: this.root,
    data: this.rowData,
    event,
  });

  /**
   * Set index attribute
   */
  protected setIndexAttribute = (): void => {
    this.root.setAttribute(HTMLDataAttributes.ROW_INDEX, `${this.index}`);
  };

  /**
   * Method where specified metadata of dataRow should affect on it behavior
   */
  protected processMetadata = (): void => {
    this.setIndexAttribute();
  };

  /**
   * Creates html container for future cell and sets parameters to it
   * @returns {HTMLContainer} created cell
   */
  protected createCell(): HTMLElement {
    const cell = document.createElement('div');

    cell.classList.add(gridCellClass);

    return cell;
  }

  /**
   * Get value from rowData by specified column
   * @param column {number} specified column
   * @returns {string | undefined} string value of the cell
   */
  protected getCellValue(column: number): string | undefined {
    return this.rowData[column]?.value;
  }

  /**
   * Removes specified cell from container
   * @param cell {HTMLElement} specified cell
   */
  protected removeCell(cell: HTMLElement): void {
    cell.remove();
  }

  /**
   * Set width of root container
   * @param widthPx {number} new width of root container
   */
  protected setWidth = (widthPx: number) => {
    this.root.style.width = `${widthPx}px`;
  };

  /**
   * Creates map for columns to more convenient access to columns
   * @param columns {Column[]} columns configuration
   * @returns {Map<string, Column>} created map
   */
  protected mapColumns = (columns: Column[]): Map<string, Column> =>
    new Map(columns.map((column) => [column.id, column]));

  /**
   * When columns configuration is updated [LEGACY] In infinite columns configuration we can just trigger the handleDataUpdate()
   * @param columns {Column[]}
   */
  public handleColumnsUpdate = (columns: Column[]) => {
    this.columns = [...columns];
    this.manageContainerWidth();
  };

  /**
   * LEGACY, setting up the dataContainer width to have possibility to scroll it, previously it was calculated using current data size
   */
  protected manageContainerWidth = (): void => {
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

    this.width = left;
  };

  /**
   * Updates width of specified cell
   * @param cell {HTMLElement} specified cell
   * @param width {number} new width of the cell
   */
  protected updateCellWidth = (cell: HTMLElement, width: number) => {
    cell.style.width = `${width}px`;
  };

  /**
   * Updates the left position of specified cell
   * @param cell {HTMLElement} specified cell
   * @param posX {number} new left position of the cell
   */
  protected updateCellPosition = (cell: HTMLElement, posX: number) => {
    cell.style.left = `${Math.floor(posX)}px`;
  };

  /**
   * Find first column that comes after the scrollLeft, first visible column. Place where should be binary search, if columns configuration will be removed
   * @param scrollLeft {number} horizontal coordinate
   * @returns {number} first column
   */
  protected findFirstColumn = (scrollLeft: number): number => {
    let currentWidth = 0;

    for (let i = 0; i < this.columns.length; i++) {
      const columnWidth = this.columns[i].width;
      currentWidth += Math.floor(columnWidth);

      if (currentWidth >= scrollLeft) return i + 1;
    }

    return this.columns.length;
  };

  /**
   * Find last column in viewport relatively first found column
   * @param scrollLeft {number} horizontal coordinate
   * @returns {number} last column
   */
  protected findLastColumn(
    firstColumn: number,
    scrollLeft: number,
    rootWidth: number
  ): number {
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
  /**
   * Putting into buffer elements from "from - 1" to "this.firstIndex". After release elements from buffer will be distributed in positions this.firstIndex...this.lastIndex
   * @param from {number} starting from number
   */
  protected releaseCellsPrev(from: number) {
    for (let i = from - 1; i >= this.firstIndex; i--) {
      this.release(i);
    }
  }

  /**
   * Putting into buffer elements from "from + 1" to "this.lastIndex". After release elements from buffer will be distributed in positions this.firstIndex...this.lastIndex
   * @param from {number} starting from number
   */
  protected releaseCellsNext(from: number) {
    for (let i = from + 1; i <= this.lastIndex; i++) {
      this.release(i);
    }
  }

  /**
   * Putting row in state[index] into buffer and removes from container
   * @param index {number} specified index
   */
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

  /**
   * If buffer is not empty, take the cell from the buffer, else creates cell
   * @returns {HTMLElement} rendered, updated, newly minted cell
   */
  protected acquire(): HTMLElement {
    const cell: HTMLElement =
      this.buffer.length > 0
        ? this.buffer.pop() ?? this.createCell()
        : this.createCell();

    this.dataContainer.appendChild(cell);

    return cell;
  }

  /**
   * Gets is any connected to cell field cell in table rendered
   *
   * @private
   * @param {GridCell} cellData
   * @returns {boolean}
   */
  private getIsPreviousFieldCellsRendered(cellData: GridCell): boolean {
    const { startCol } = cellData;

    if (cellData.table && cellData.field) {
      for (let i = startCol; i < cellData.col; i++) {
        const fieldCellData: GridCell | undefined = this.columns[
          i - 1
        ].getValue(this.rowData);

        if (
          fieldCellData &&
          fieldCellData.field?.fieldName === cellData.field?.fieldName &&
          fieldCellData.table?.tableName === cellData.table?.tableName
        ) {
          return true;
        }
      }

      return false;
    }

    if (cellData.table) {
      for (let i = startCol; i < cellData.col; i++) {
        const fieldCellData: GridCell | undefined = this.columns[
          i - 1
        ].getValue(this.rowData);

        if (
          fieldCellData &&
          fieldCellData.table?.tableName === cellData.table.tableName
        ) {
          return true;
        }
      }

      return false;
    }

    for (let i = startCol; i < cellData.col; i++) {
      const fieldCellData: GridCell | undefined = this.columns[i - 1].getValue(
        this.rowData
      );

      if (
        fieldCellData &&
        fieldCellData.startCol === cellData.startCol &&
        fieldCellData.endCol === cellData.endCol
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Cell width depends from data. It's calculating the width of the cell to draw it correctly
   * @param cellData {GridCell} data got from rowData
   * @param firstColumn {number} first visible column
   * @returns {number} width of specified cell
   */
  private getCellWidth = (cellData: GridCell, firstColumn: number): number => {
    const isPrevCellsRendered =
      this.getIsPreviousFieldCellsRendered(cellData) &&
      firstColumn < cellData.col;

    return !isPrevCellsRendered
      ? this.getCellX(cellData.endCol + 1) - this.getCellX(cellData.col)
      : 0;
  };

  /**
   * Gets absolute horizontal position for specified column
   * @param col {number} specified column
   * @returns {number} horizontal position
   */
  public getCellX(col: number): number {
    let x = -this.scrollLeft;

    for (let i = 1; i < col; ++i) {
      x += this.columns[i - 1]?.width ?? 0;
    }

    return Math.floor(x);
  }

  /**
   * Main rendering flow.
   * all cells movement happens because of the native scrolling root container,
   * state allocate a lot of cells with precalculated position left: 0, left: 60, top: 120, ...,
   * after scrolling in handleDataUpdate() from state indexes < firstIndex, rows will be placed to buffer
   * same with state indexes > lastIndex
   * to firstIndex < index < lastIndex, will be placed new cells.
   * for every new allocated cell triggering handleDataUpdate.
   */
  public handleDataUpdate = (
    data: RowData,
    scrollLeft: number,
    rootWidth: number
  ) => {
    if (!this.columns.length) return;

    this.rowData = data;

    const firstColumn = this.findFirstColumn(scrollLeft);

    this.releaseCellsPrev(firstColumn);

    const lastColumn = this.findLastColumn(firstColumn, scrollLeft, rootWidth);

    this.releaseCellsNext(lastColumn);

    let i = firstColumn;

    while (i <= lastColumn && this?.state?.[i]) {
      const state = this.state[i];
      const cellData: GridCell = this.columns[i - 1].getValue(this.rowData) || {
        col: i,
        row: this.index,
        startCol: i,
        endCol: i,
      };

      const width = this.getCellWidth(cellData, firstColumn);

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
      this.updateCellWidth(state.cell, Math.floor(width));

      i++;
    }

    this.firstIndex = firstColumn;
    this.lastIndex = lastColumn;
  };

  /**
   * Renders row
   */
  public render = () => this.root;

  /**
   * Removes row
   */
  public remove = (): void => this.root.remove();

  /**
   * Set height of this row
   * @param height {number} new height of the row
   */
  public setHeight(height: number) {
    this.height = height;
    this.root.style.height = `${height}px`;
  }

  /**
   * Sets index attribute and set up right position of root container relatively dataView dataContainer
   * @param index {number} specified index
   * @param top {number} top position relatively dataView dataContainer
   */
  public setIndex(index: number, top: number) {
    this.index = index;
    this.root.style.transform = `translateY(${top}px)`;
    this.top = top;
    this.setIndexAttribute();
  }

  /**
   * Destroys row
   */
  public destroy() {
    super.destroy();
    this.root.remove();
  }
}
