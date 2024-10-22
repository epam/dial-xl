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
export const newLine = '\r\n';
export const currentTableRef = '$';
export const naExpression = 'NA';
export const naValue = 'N/A';
export const errorFunction = 'ERR';
export const placementDecoratorName = 'placement';
export const fieldColSizeDecoratorName = 'size';
export const manualTableDecorator = '!manual()';
export const hideTableHeaderDecoratorName = 'hideHeader';
export const hideTableHeaderDecorator = `!${hideTableHeaderDecoratorName}()`;
export const hideTableFieldsDecoratorName = 'hideFields';
export const hideTableFieldsDecorator = `!${hideTableFieldsDecoratorName}()`;
export const horizontalDirectionDecoratorName = 'horizontal';
export const horizontalDirectionDecorator = `!${horizontalDirectionDecoratorName}()`;

export const escapeChar = "'";
export const tableNameShouldBeEscapedChars = ["'"];
export const fieldShouldBeEscapedChars = ["'", '[', ']'];
export const stringShouldBeEscapedChars = ["'", '"'];

export const minTablePlacement = 1;

export function getPlacementDecorator(col: number, row: number) {
  return `!placement(${row}, ${col})`;
}

export function getFieldSizesDecorator(size: number) {
  return `!${fieldColSizeDecoratorName}(${size})`;
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
  expressionDslPlacement: ShortDSLPlacement | undefined;
  fieldNameDslPlacement: ShortDSLPlacement | undefined;
  totalDslPlacement: ShortDSLPlacement | undefined;
  type: TotalType | undefined;
};
export type TotalItems = Record<number, TotalItem>;
export type TableTotals = Record<string, TotalItems>;

export interface ExpressionMetadata {
  text: string;
  start: number;
  end: number;
}
