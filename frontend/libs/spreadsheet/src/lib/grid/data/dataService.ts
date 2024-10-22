import { inject, injectable } from 'inversify';
import { BehaviorSubject, Subject } from 'rxjs';

import { CONFIG, Destroyable } from '@deltix/grid-it';
import type { GridItOptions } from '@deltix/grid-it-core';
import { GridCell, GridData } from '@frontend/common';

import { IDataService } from './types';

@injectable()
export class DataService<T> extends Destroyable implements IDataService {
  protected loading = new BehaviorSubject(false);
  protected data = new BehaviorSubject<GridData>({}); // emits in any case
  protected allData = new BehaviorSubject<T[]>([]); // emits only when data is fully updated
  protected appended = new Subject<T[]>(); // emits only the appended data

  protected lastDataRequest: null | number = null;

  constructor(@inject(CONFIG) protected options: GridItOptions<T>) {
    super();
  }

  get loading$() {
    return this.loading.asObservable();
  }

  get data$() {
    return this.data.asObservable();
  }

  get allData$() {
    return this.allData.asObservable();
  }

  get appended$() {
    return this.appended.asObservable();
  }

  destroy() {
    this.data.complete();
    this.allData.complete();
    this.appended.complete();
    super.destroy();
  }

  setLoading = (isLoading: boolean) => {
    this.loading.next(isLoading);
  };

  setData(data: GridData) {
    this.data.next(data);
  }

  requestMoreData() {
    // some classes requires this method
    return;
  }

  setCell(col: number, row: number, cell: GridCell): void {
    const gridData = this.data.getValue() as GridData;

    if (!(row in gridData)) gridData[row] = {};

    gridData[row][col] = cell;

    this.data.next(gridData);
  }

  public getCell(col: number, row: number): GridCell | undefined {
    const gridData = this.data.getValue() as GridData;

    if (!(row in gridData)) return;

    if (!(col in gridData[row])) return;

    return gridData[row][col];
  }

  public getNextCell({
    col,
    row,
    colDirection,
    rowDirection,
  }: {
    col: number;
    row: number;
    colDirection?: 'left' | 'right';
    rowDirection?: 'top' | 'bottom';
  }) {
    const cell = this.getCell(col, row);
    const colOffset =
      colDirection !== undefined ? (colDirection === 'left' ? -1 : 1) : 0;
    const rowOffset =
      rowDirection !== undefined ? (rowDirection === 'top' ? -1 : 1) : 0;

    if (cell?.table && cell.isTableHeader) {
      return {
        col:
          colOffset > 0
            ? cell.table.endCol + colOffset
            : cell.table.startCol + colOffset,
        row: row + rowOffset,
      };
    }

    if (!cell || !cell.startCol || !cell.endCol) {
      return {
        col: col + colOffset,
        row: row + rowOffset,
      };
    }

    return {
      col: (colDirection === 'right' ? cell.endCol : cell.startCol) + colOffset,
      row: row + rowOffset,
    };
  }

  // public getCellSize

  public isTableHeader(col: number, row: number) {
    const cell = this.getCell(col, row);

    if (!cell || !cell.table) return false;

    return !!cell.isTableHeader;
  }

  public isTableField(col: number, row: number) {
    const cell = this.getCell(col, row);

    if (!cell || !cell.table) return false;

    return !!cell.isFieldHeader;
  }
}
