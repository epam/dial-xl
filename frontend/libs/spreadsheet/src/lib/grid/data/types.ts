import { Observable } from 'rxjs';

import { IDataRow as IDeltixGridDataRow } from '@deltix/grid-it-core';
import { GridCell, GridData, RowData } from '@frontend/common';

export type IInfiniteScrollOptions = {
  triggerArea: number;
  scrollArea: [number, number];
  batch: number;
};

export interface IScroll {
  scrollTop: number;
  scrollHeight: number;
}

export interface IDataViewState {
  top: number;
  height: number;
  row: IDataRow | undefined;
}

export type IDataRow = Omit<IDeltixGridDataRow<RowData>, 'handleDataUpdate'> & {
  handleDataUpdate: (
    rowData: RowData,
    scrollLeft: number,
    rootWidth: number
  ) => void;
  edges: [number, number];
  width: number;
  getCellX: (col: number) => number;
};

export interface IDataCellState {
  left: number;
  width: number;
  cell: HTMLElement | undefined;
}

export interface IDataService {
  data$: Observable<GridData>;
  loading$: Observable<boolean>;

  setLoading: (isLoading: boolean) => void;
  getCell: (col: number, row: number) => GridCell | undefined;
  getNextCell: ({
    col,
    row,
    colDirection,
    rowDirection,
  }: {
    col: number;
    row: number;
    colDirection?: 'left' | 'right';
    rowDirection?: 'top' | 'bottom';
  }) => { col: number; row: number };
  isTableHeader: (col: number, row: number) => boolean;
  isTableField: (col: number, row: number) => boolean;

  setData(data: GridData): void;
  setCell(col: number, row: number, cell: GridCell): void;
}

export interface IRowNumberResize {
  width: number;
}
