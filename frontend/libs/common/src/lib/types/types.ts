import { MenuProps } from 'antd';

import {
  ColumnData,
  CompilationError,
  FieldKey,
  ParsingError,
  PeriodSeries,
} from '../services';

export type FormulasContextMenuKeyData = {
  insertFormula?: string;
  tableName?: string;
  type?: 'derived' | 'size' | 'copy' | 'pivot' | 'groupBy';
};

export type InsertChartContextMenuKeyData = {
  chartType: ChartType;
  tableName: string;
  col?: number;
  row?: number;
};

export type MenuItem = Required<MenuProps>['items'][number];
export type MenuItemProps = {
  label: React.ReactNode;
  key?: React.Key | null;
  fullPath: string[];
  icon?: React.ReactNode;
  children?: MenuItem[];
  disabled?: boolean;
  tooltip?: string;
  type?: 'group';
  shortcut?: string;
  stopPropagationOnClick?: boolean;
  onClick?: () => void;

  // When content is custom we don't want to apply paddings on it
  isCustomContent?: boolean;
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

export type EvaluationError =
  | CompilationError
  | RuntimeError
  | IndexError
  | ParsingError;
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
  CLUSTERED_BAR = 'clustered-bar-chart',
  STACKED_BAR = 'stacked-bar-chart',
  CLUSTERED_COLUMN = 'clustered-column-chart',
  STACKED_COLUMN = 'stacked-column-chart',
  HISTOGRAM = 'histogram',
}
export type FieldSortOrder = 'asc' | 'desc' | null;

export type GridListFilter = {
  value: string;
  isSelected: boolean;
  isFiltered?: boolean;
};

export type ControlData = {
  data: ColumnData;
  available: ColumnData;
  selectedValues: string[];
};

export enum Highlight {
  'DIMMED' = 'DIMMED',
  'NORMAL' = 'NORMAL',
  'HIGHLIGHTED' = 'HIGHLIGHTED',
}

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

  showVisualMap: boolean;
  showLegend: boolean;
  showTitle: boolean;
  chartOrientation: ChartOrientation;
  legendPosition: ChartLegendPosition;
};

export type ChartOrientation = 'horizontal' | 'vertical';
export type ChartLegendPosition = 'top' | 'bottom' | 'left' | 'right';

export type FormulaBarMode = 'formula' | 'value';

export type PointClickModeSource = 'cell-editor' | 'formula-bar' | null;
export type GetCompletionFunction = (body: string) => Promise<Response>;

export type TableArrangeType = 'forward' | 'backward' | 'front' | 'back';

export type GridFilterType = 'numeric' | 'text';

export type ViewportInteractionMode = 'pan' | 'select';
