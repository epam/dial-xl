import { Observable } from 'rxjs';

import { IDataRow as IDeltixGridDataRow } from '@deltix/grid-it-core';
import { ColumnDataType } from '@frontend/common';

export type ChartType = 'line' | 'tabular';

export type GridTable = {
  startRow: number;
  startCol: number;
  endCol: number;
  endRow: number;
  tableName: string;
  chartType?: ChartType;
};

export type GridField = {
  fieldName: string;
  expression: string;
  isKey: boolean;
  isDim: boolean;
  isNested: boolean;
  isPeriodSeries: boolean;
  isDynamic: boolean;
  type: ColumnDataType;
  referenceTableName?: string;
};

export type GridCell = {
  table?: GridTable;
  field?: GridField;
  value?: string;
  error?: string;
  overrideIndex?: number;
  isOverride?: boolean;
  isManual?: boolean;
  row: number;
  col: number;

  zIndex?: number;

  // If some cell contains intersection of tables, we should draw all table headers
  tables?: GridTable[];
};

export type RowData = { [col: string]: GridCell };

export type GridData = {
  [row: string]: RowData;
};

export type GridChart = {
  tableName: string;
  startRow: number;
  startCol: number;
  endCol: number;
  endRow: number;
  chartType: ChartType;
  keys: string[];
  selectedKeys: Record<string, string>;
};

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
  isTableHeader: (col: number, row: number) => boolean;
  isTableField: (col: number, row: number) => boolean;

  setData(data: GridData): void;
  setCell(col: number, row: number, cell: GridCell): void;
}

export interface IRowNumberResize {
  width: number;
}
