import { MenuProps } from 'antd';

import {
  OverrideValue,
  ParsedConditionFilter,
  ParsedField,
  ParsedTable,
  TotalType,
} from '@frontend/parser';

import {
  ColumnDataType,
  ColumnFormat,
  CompilationError,
  FieldKey,
  PeriodSeries,
} from '../services';

export type FormulasContextMenuKeyData = {
  insertFormula?: string;
  tableName?: string;
  type?: 'derived' | 'size' | 'copy' | 'pivot';
};

export type InsertChartContextMenuKeyData = {
  chartType: ChartType;
  col?: number;
  row?: number;
};

export type MenuItem = Required<MenuProps>['items'][number];
export type MenuItemProps = {
  label: React.ReactNode;
  key?: React.Key | null;
  icon?: React.ReactNode;
  children?: MenuItem[];
  disabled?: boolean;
  tooltip?: string;
  type?: 'group';
  shortcut?: string;
  stopPropagationOnClick?: boolean;
  onClick?: () => void;
};

export type GridViewport = {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
};

export type CachedViewport = {
  requestedRows?: number[][];
  startRow: number;
  endRow: number;
  fields?: Set<string>;
};

export type CachedViewports = {
  [tableName: string]: CachedViewport;
};

export type SelectedChartKey = {
  chartType: ChartType;
  tableName: string;
  fieldName: string;
  key: string | number | (string | number)[];
};

export type ChartTableWithoutSelectors = {
  chartType: ChartType;
  tableName: string;
};

export type TablesData = {
  [tableName: string]: TableData;
};

export type TotalData = {
  [columnName: string]: Record<number, string>;
};

export interface HighlightData {
  tableHighlight?: Highlight;
  fieldsHighlight?: { fieldName: string; highlight: Highlight }[];
}

export type TableHighlightDataMap = {
  defaultHighlight: Highlight;
  data: Record<string, HighlightData | undefined>;
};

export type VirtualTablesData = {
  [tableName: string]: VirtualTableData;
};

export type VirtualTableData = {
  chunks: { [index: number]: ColumnChunk };

  totalRows: number;
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

export type ColumnChunk = { [columnName: string]: string[] };

export type ChartsData = {
  [tableName: string]: ChartData;
};

export type ChartData = {
  [columnName: string]: {
    rawValues: PeriodSeries[] | string[];
    displayValues: PeriodSeries[] | string[];
  };
};

export type RuntimeError = CompilationError;
export type IndexError = {
  fieldKey: FieldKey;
  message: string;
};

export enum AppTheme {
  ThemeLight = 'theme-light',
  ThemeDark = 'theme-dark',
  ThemeDarkMixed = 'theme-dark-mixed',
}

// Spreadsheet types

export enum ChartType {
  PERIOD_SERIES = 'period-series-chart',
  LINE = 'line-chart',
  HEATMAP = 'heat-map',
  SCATTER_PLOT = 'scatter-plot',
  PIE = 'pie-chart',
  BAR = 'bar-chart',
  FLAT_BAR = '2d-bar-chart',
  STACKED_BAR = 'stacked-bar-chart',
  HISTOGRAM = 'histogram',
}
export type FieldSortOrder = 'asc' | 'desc' | null;

export type GridListFilter = {
  value: string;
  isSelected: boolean;
  isFiltered?: boolean;
};

export enum Highlight {
  'DIMMED' = 'DIMMED',
  'NORMAL' = 'NORMAL',
  'HIGHLIGHTED' = 'HIGHLIGHTED',
}

export type GridTable = {
  startRow: number;
  startCol: number;
  endCol: number;
  endRow: number;
  tableName: string;
  chartType?: ChartType;
  isTableNameHeaderHidden: boolean;
  isTableFieldsHeaderHidden: boolean;
  isTableHorizontal: boolean;
  totalSize: number;
  hasKeys: boolean;
  isManual: boolean;
  highlightType?: 'DIMMED' | 'NORMAL' | 'HIGHLIGHTED' | undefined;
  note: string;
  fieldNames: string[];
};

export type GridField = {
  fieldName: string;
  expression: string;
  isKey: boolean;
  isDim: boolean;
  isNested: boolean;
  isPeriodSeries: boolean;
  isDynamic: boolean;
  isFiltered: boolean;
  filter?: ParsedConditionFilter;
  totalFieldTypes?: TotalType[];
  sort: FieldSortOrder;
  isFieldUsedInSort: boolean;
  type: ColumnDataType;
  format: ColumnFormat | undefined;
  referenceTableName?: string;
  note?: string;
  hasError: boolean;
  errorMessage?: string;
  highlightType?: 'DIMMED' | 'NORMAL' | 'HIGHLIGHTED' | undefined;
  isIndex: boolean;
  isDescription: boolean;
  descriptionField?: string;
  dataLength: number;
  hasOverrides: boolean;
};

export type GridCell = {
  table?: GridTable;
  field?: GridField;
  value?: string;
  displayValue?: string;

  hasError?: boolean;
  errorMessage?: string;

  totalIndex?: number;
  totalType?: TotalType;
  totalExpression?: string;

  row: number;
  col: number;
  dataIndex?: number;

  overrideIndex?: number;
  overrideValue?: OverrideValue;
  isOverride?: boolean;

  isUrl?: boolean;

  isTableHeader?: boolean;
  isFieldHeader?: boolean;

  isRightAligned?: boolean;

  startCol: number;
  endCol: number;

  startGroupColOrRow: number;
  endGroupColOrRow: number;
};

export type RowData = { [col: string]: GridCell };

export type GridData = {
  [row: string]: RowData;
};

export type CellPlacement = {
  row: number;
  col: number;
};

export type GridChartSection = {
  valueFieldNames: string[];
  xAxisFieldName: string | null;
  dotSizeFieldName: string | null;
  dotColorFieldName: string | null;
  histogramBucketsCount: number | null;
  histogramDataTableName: string | null;
};

export type GridChart = {
  tableName: string;
  startRow: number;
  startCol: number;
  endCol: number;
  endRow: number;
  tableStartCol: number;
  tableStartRow: number;

  chartType: ChartType;
  selectorFieldNames: string[];
  availableKeys: Record<string, string[] | number[]>;
  selectedKeys: Record<string, string | string[] | number | number[]>;
  keysWithNoDataPoint: Record<string, string[]>;

  chartSections?: GridChartSection[];

  customSeriesColors: Record<string, string>;

  showLegend: boolean;
  isEmpty: boolean;
  chartOrientation: ChartOrientation;
};

export type ChartOrientation = 'horizontal' | 'vertical';

export type GridFieldCache = {
  field: ParsedField;
  fieldIndex: number;
  dataFieldSecondaryDirectionStart: number;
  fieldSize: number;
  isRightAligned: boolean;
  cellField: GridField;
};

export type FormulaBarMode = 'formula' | 'value';

export type PointClickModeSource = 'cell-editor' | 'formula-bar' | null;
export type GetCompletionFunction = (body: string) => Promise<Response>;

export type TableArrangeType = 'forward' | 'backward' | 'front' | 'back';

export type GridFilterType = 'numeric' | 'text';

export type ViewportInteractionMode = 'pan' | 'select';
