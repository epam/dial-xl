import { GridField } from '@frontend/canvas-spreadsheet';
import {
  ColumnChunk,
  ColumnDataType,
  ColumnFormat,
  FieldSortOrder,
  HighlightData,
  TotalData,
  Viewport,
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
  startColumn?: number;
  endColumn?: number;
  totalColumns?: number;
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
  dynamicFields?: (string | undefined)[];
  isDynamicFieldsRequested: boolean;

  totalRows: number;
  isTotalRowsUpdated: boolean;
  highlightData: HighlightData | undefined;

  fieldErrors: { [columnName: string]: string };
  indexErrors: { [columnName: string]: string };

  columnHashes: { [columnName: string]: string | undefined };
  previousColumnHashes: { [columnName: string]: string | undefined };

  nestedColumnNames: Set<string>;

  columnReferenceTableNames: { [columnName: string]: string };
  types: { [columnName: string]: ColumnDataType };
  formats: { [columnName: string]: ColumnFormat | undefined };
};

export type TablesData = {
  [tableName: string]: TableData;
};

export type DynamicColumnRange = {
  start: number;
  end: number;
};

export type Range = [number, number];
export type TableFieldsPlan = {
  fields: string[];
  dynamicRange?: DynamicColumnRange;
};

export type ViewportWithColumnRange = Viewport & {
  start_column?: number;
  end_column?: number;
};

export type TableViewportCache = {
  startRow: number;
  endRow: number;

  /** Which data-axis row ranges have been requested for this table? */
  requestedRows: Range[];

  /** Which fields have been requested at least once? */
  fields: Set<string>;

  /** Which dynamic-column ranges for '*' have been requested (relative indices). */
  requestedDynamicColumns: Range[];
};

export type TableFieldsForViewportResult = {
  /**
   * Field names that should be requested for the current viewport.
   */
  fields: string[];
  /**
   * If present, indicates which dynamic columns should be resolved for '*'.
   */
  dynamicRange?: DynamicColumnRange;
};

export const extraDirectionOffset = 50;
