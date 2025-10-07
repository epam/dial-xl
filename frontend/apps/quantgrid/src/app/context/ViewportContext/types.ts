import { GridField } from '@frontend/canvas-spreadsheet';
import {
  ColumnChunk,
  ColumnDataType,
  ColumnFormat,
  FieldSortOrder,
  HighlightData,
  TotalData,
} from '@frontend/common';
import {
  ParsedConditionFilter,
  ParsedField,
  ParsedTable,
} from '@frontend/parser';

export type ChartUpdate = {
  chartName?: string;
  isKeyUpdate?: boolean;
  isChartDataUpdate?: boolean;
  virtualTableName?: string;
};

export type FiltersUpdate = {
  sourceTableName?: string;
  virtualTableName?: string;
};

export type TableDynamicFieldsLoadUpdate = {
  tableName: string;
  dynamicFields: string[];
};

export type TableDimensions = {
  startRow: number;
  startCol: number;
  endCol: number;
  endRow: number;
};

export type ApplyBlockGridParams = {
  sort: FieldSortOrder;
  isFiltered: boolean;
  filter: ParsedConditionFilter | undefined;
  isFieldUsedInSort: boolean;
};

export type GroupInfo = {
  start: number;
  span: number;
};

export type GridFieldCache = {
  field: ParsedField;
  fieldIndex: number;
  dataFieldSecondaryDirectionStart: number;
  fieldSize: number;
  isRightAligned: boolean;
  cellField: GridField;
};

export type TableData = {
  chunks: { [index: number]: ColumnChunk };
  // when table has new definition -> should put all data to cache and showing it, until new data come
  fallbackChunks: { [index: number]: ColumnChunk };

  total: TotalData;

  table: ParsedTable;
  dynamicFields?: string[];
  isDynamicFieldsRequested: boolean;

  totalRows: number;
  highlightData: HighlightData | undefined;

  fieldErrors: { [columnName: string]: string };
  indexErrors: { [columnName: string]: string };

  nestedColumnNames: Set<string>;

  columnReferenceTableNames: { [columnName: string]: string };
  types: { [columnName: string]: ColumnDataType };
  formats: { [columnName: string]: ColumnFormat | undefined };
};

export type TablesData = {
  [tableName: string]: TableData;
};
