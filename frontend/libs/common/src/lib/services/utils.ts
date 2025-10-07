import { ColumnDataType } from './serverApi';

const complexTypes = [
  ColumnDataType.PERIOD_SERIES,
  ColumnDataType.TABLE_REFERENCE,
  ColumnDataType.TABLE_VALUE,
];

const tableTypes = [ColumnDataType.TABLE_REFERENCE, ColumnDataType.TABLE_VALUE];

export function isTableType(type: ColumnDataType): boolean {
  return tableTypes.includes(type);
}

export function isComplexType(field?: {
  type: ColumnDataType;
  isNested: boolean;
}) {
  if (!field) return false;

  const { type, isNested } = field;

  return complexTypes.includes(type) || isNested;
}

export function compareTableNames(a: string, b: string) {
  const aName = a.replaceAll("'", '');
  const bName = b.replaceAll("'", '');

  return aName === bName;
}

export function isNumericType(type: ColumnDataType) {
  return type === ColumnDataType.DOUBLE;
}

export function isTextType(type: ColumnDataType) {
  return type === ColumnDataType.STRING;
}

// new URL() is too heavy to check all values in the grid
export function isValidUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function getTableFieldLabel(tableName: string, fieldName = ''): string {
  if (!tableName && !fieldName) return '';
  if (!fieldName) return tableName;

  return `${tableName}[${fieldName}]`;
}

export function toExcelColumnName(index: number): string {
  let n = index + 1;
  let result = '';

  while (n > 0) {
    const remainder = (n - 1) % 26;
    const char = String.fromCharCode(65 + remainder);
    result = char + result;
    n = Math.floor((n - 1) / 26);
  }

  return result;
}
