import { ParsedSheet } from './ParsedSheet';

export const dynamicFieldName = '*';
export const defaultRowKey = 'row';
export const keyKeyword = 'key';
export const dimKeyword = 'dim';
export const tableKeyword = 'table';
export const overrideKeyword = 'override';
export const applyKeyword = 'apply';
export const sortKeyword = 'sort';
export const filterKeyword = 'filter';
export const totalKeyword = 'total';
export const lineBreak = '\n';
export const newLine = '\r\n';
export const currentTableRef = '$';
export const naExpression = 'NA';
export const naValue = 'N/A';
export const errorFunction = 'ERR';
export const visualizationDecoratorName = 'visualization';
export const visualizationDecorator = '!visualization';
export const chartSizeDecoratorName = 'size';
export const chartSizeDecorator = '!size';
export const layoutDecoratorName = 'layout';
export const fieldColSizeDecoratorName = 'size';
export const chartSelectorDecorator = '!selector';
export const chartSelectorDecoratorName = 'selector';
export const chartSeriesColorDecoratorName = 'color';
export const chartXAxisDecoratorName = 'x';
export const chartSeparatorDecoratorName = 'separator';
export const chartSeparatorDecorator = '!separator()';
export const chartDotColorDecoratorName = 'dotcolor';
export const chartDotSizeDecoratorName = 'dotsize';
export const chartHorizontalDecoratorArg = 'column-wise';
export const manualTableDecoratorName = 'manual';
export const manualTableDecorator = '!manual()';
export const formatDecoratorName = `format`;
export const sourceFieldName = 'source';
export const indexDecoratorName = 'index';
export const descriptionDecoratorName = 'description';

export const escapeChar = "'";
export const tableNameShouldBeEscapedChars = ["'"];
export const fieldShouldBeEscapedChars = ["'", '[', ']'];
export const stringShouldBeEscapedChars = ["'", '"'];

export const minTablePlacement = 1;

export const getLayoutDecorator = (
  col: number,
  row: number,
  includeDecoratorName: boolean,
  args?: string[]
) => {
  return `${
    includeDecoratorName ? `!${layoutDecoratorName}` : ''
  }(${row}, ${col}${
    args?.length ? `, ${args?.map((arg) => `"${arg}"`).join(', ')}` : ''
  })`;
};

export function getFormatDecoratorArgs(
  formatParams: (string | number | boolean)[]
): string {
  return `(${formatParams
    .map((item) => (typeof item === 'boolean' ? (item ? 1 : 0) : item))
    .map((item) => (typeof item === 'number' ? item : `"${item}"`))
    .join(', ')})`;
}

export type OverrideRows = OverrideRow[] | null;
export type OverrideValue = string | number | null;
export type OverrideRow = Record<string, OverrideValue>;

export type DSLNote = {
  text: string;
  start: number;
  end: number;
};

export type ShortDSLPlacement = {
  start: number;
  end: number;
};

export type FullDSLPlacement = {
  startOffset: number;
  stopOffset: number;
  startLine: number;
  stopLine: number;
  startColumn: number;
};

export type FieldSortOrder = 'asc' | 'desc' | null;

export type ParsedSheets = Record<string, ParsedSheet>;

export type TotalType =
  | 'sum'
  | 'average'
  | 'count'
  | 'stdevs'
  | 'median'
  | 'mode'
  | 'max'
  | 'min'
  | 'custom';

export type TotalItem = {
  expression: string;
  type: TotalType | undefined;
};
export type TotalItems = Record<number, TotalItem>;
export type TableTotals = Record<string, TotalItems>;

export interface ExpressionMetadata {
  text: string;
  start: number;
  end: number;
}

export type FieldHeaderPlacement = {
  startCol: number;
  endCol: number;
  startRow: number;
  endRow: number;
};

export enum FilterOperator {
  Equals = '=',
  NotEquals = '<>',
  GreaterThan = '>',
  GreaterThanOrEqual = '>=',
  LessThan = '<',
  LessThanOrEqual = '<=',
  Between = 'between',
  BeginsWith = 'beginsWith',
  EndsWith = 'endsWith',
  Contains = 'contains',
  NotContains = 'notContains',
}

export type ModifyFilterProps = {
  fieldName?: string;
  conditionFilter?: string | null;
  excludeFieldName?: string;
  oldFieldName?: string;
  newFieldName?: string;
};

// same as in common lib to avoid circular dependency
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
