import {
  escapeName,
  fieldShouldBeEscapedChars,
  tableNameShouldBeEscapedChars,
} from '@frontend/parser';

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

export function escapeTableName(name: string, fullSanitize = false): string {
  let tableName = name;

  if (tableName.startsWith("'") && tableName.endsWith("'")) {
    tableName = tableName.slice(1, -1);
  }

  const quotedTableNameRegex = /[^a-zA-Z0-9_]/;

  const shouldBeQuoted = quotedTableNameRegex.test(tableName);

  let escapedTableName = escapeName(
    tableName,
    tableNameShouldBeEscapedChars,
    fullSanitize
  );

  escapedTableName = shouldBeQuoted
    ? `'${escapedTableName}'`
    : escapedTableName;

  return escapedTableName;
}

export function unescapeTableName(name: string): string {
  const shouldBeUnquoted = name.startsWith("'") && name.endsWith("'");

  let resultName = shouldBeUnquoted ? name.slice(1, -1) : name;
  const preparedEscapedChars = tableNameShouldBeEscapedChars
    .map((char) => '\\' + char)
    .join('');
  const regEx = new RegExp(
    String.raw`(.)?(['])([${preparedEscapedChars}])`,
    'g'
  );
  resultName = resultName.replaceAll(regEx, '$1$3');

  return resultName;
}

export function escapeFieldName(name: string, fullSanitize = false): string {
  if (name.startsWith('[') && name.endsWith(']')) {
    name = name.slice(1, -1);
  }

  return escapeName(name, fieldShouldBeEscapedChars, fullSanitize);
}

export function unescapeFieldName(name: string): string {
  const preparedEscapedChars = fieldShouldBeEscapedChars
    .map((char) => '\\' + char)
    .join('');
  const regEx = new RegExp(
    String.raw`(.)?(['])([${preparedEscapedChars}])`,
    'g'
  );
  const resultName = name.replaceAll(regEx, '$1$3');

  return resultName;
}

export function compareTableNames(a: string, b: string) {
  const aName = a.replaceAll("'", '');
  const bName = b.replaceAll("'", '');

  return aName === bName;
}

export function isNumericType(type: ColumnDataType) {
  return type === ColumnDataType.INTEGER || type === ColumnDataType.DOUBLE;
}

export function isValidUrl(value: string) {
  try {
    const url = new URL(value);

    return ['http:', 'https:'].includes(url.protocol);
  } catch (e) {
    return false;
  }
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
