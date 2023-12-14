export const dynamicFieldName = '*';
export const defaultRowKey = 'row';
export const keyKeyword = 'key';
export const newLine = '\r\n';
export const currentTableRef = '$';

export type OverrideRows = OverrideRow[] | null;
export type OverrideValue = string | number | null;
export type OverrideRow = Record<string, OverrideValue>;
