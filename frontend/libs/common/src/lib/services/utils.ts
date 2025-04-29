import { GridCell, RuntimeError } from '../types';
import { ColumnDataType, CompilationError, ParsingError } from './serverApi';

const complexTypes = [
  ColumnDataType.INPUT,
  ColumnDataType.PERIOD_SERIES,
  ColumnDataType.PERIOD_SERIES_POINT,
  ColumnDataType.TABLE,
];

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
  return type === ColumnDataType.INTEGER || type === ColumnDataType.DOUBLE;
}

export function isTextType(type: ColumnDataType) {
  return type === ColumnDataType.STRING;
}

// new URL() is too heavy to check all values in the grid
export function isValidUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function getKeyLabelFromError(
  error: CompilationError | RuntimeError | ParsingError
): string {
  const keys = ['fieldKey', 'totalKey', 'applyKey', 'overrideKey', 'tableKey'];

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(error, key)) {
      const errorElement = error[key as never];
      const { table, field } = errorElement;

      return getTableFieldLabel(table, field);
    }
  }

  return '';
}

export function getTableFieldLabel(tableName: string, fieldName = ''): string {
  if (!tableName && !fieldName) return '';
  if (!fieldName) return tableName;

  return `${tableName}[${fieldName}]`;
}

export function shouldNotOverrideCell(cell: GridCell | undefined): boolean {
  const sortedOrFiltered =
    cell?.field?.isFiltered ||
    cell?.field?.sort ||
    cell?.field?.isFieldUsedInSort;
  const hasKeys = cell?.table?.hasKeys;
  const isManual = cell?.table?.isManual;

  return !!sortedOrFiltered && !hasKeys && !isManual;
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
