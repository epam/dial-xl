import { MenuProps } from 'antd';

import { ParsedSheet } from '@frontend/parser';

import { ColumnDataType, PeriodSeries } from './services';

export type MenuItem = Required<MenuProps>['items'][number];
export type MenuItemProps = {
  label: React.ReactNode;
  key?: React.Key | null;
  icon?: React.ReactNode;
  children?: MenuItem[];
  disabled?: boolean;
  type?: 'group';
  shortcut?: string;
};

export type ParsedSheets = Record<string, ParsedSheet>;

export type TableData = {
  [tableName: string]: TableChunkData;
};

export type TableChunkData = {
  maxKnownRowIndex: number;
  columnDataLoaded: Set<string>;
  nestedColumnNames: Set<string>;
  fieldErrors: { [columnName: string]: string };
  types: { [columnName: string]: ColumnDataType };

  chunks: { [index: number]: ColumnChunk };

  columnReferenceTableNames: { [columnName: string]: string };
};

export type ColumnChunk = { [columnName: string]: string[] };

export type ChartData = {
  [tableName: string]: ChartColumnData;
};

export type ChartColumnData = {
  [columnName: string]: PeriodSeries[];
};
