import {
  CompilationError,
  escapeFieldName,
  escapeTableName,
  OverrideKey,
  ParsingError,
  RuntimeError,
  TotalKey,
} from '@frontend/common';

export function getFieldErrors(
  parsingError: ParsingError[] | null,
  compilationError: CompilationError[] | null,
  viewportErrorMessage: string | undefined,
  tableName: string,
  fieldName: string
): string | undefined {
  const parsingMessage = getMessageByKeyFromError(
    parsingError,
    tableName,
    fieldName,
    'fieldKey'
  );
  const compilationMessage = getMessageByKeyFromError(
    compilationError,
    tableName,
    fieldName,
    'fieldKey'
  );

  if (!parsingMessage && !compilationMessage && !viewportErrorMessage) return;

  return [parsingMessage, compilationMessage, viewportErrorMessage].join('\n');
}

export function getTotalErrors(
  parsingError: ParsingError[] | null,
  compilationError: CompilationError[] | null,
  tableName: string,
  fieldName: string,
  totalRow: number
): string | undefined {
  const parsingMessage = getTotalErrorMessages(
    parsingError,
    tableName,
    fieldName,
    totalRow
  );
  const compilationMessage = getTotalErrorMessages(
    compilationError,
    tableName,
    fieldName,
    totalRow
  );

  if (!parsingMessage && !compilationMessage) return;

  return [parsingMessage, compilationMessage].join('\n');
}

export function getOverrideErrors(
  parsingError: ParsingError[] | null,
  compilationError: CompilationError[] | null,
  tableName: string,
  fieldName: string,
  overrideIndex: number
): string | undefined {
  const parsingMessage = getOverrideErrorMessages(
    parsingError,
    tableName,
    fieldName,
    overrideIndex
  );
  const compilationMessage = getOverrideErrorMessages(
    compilationError,
    tableName,
    fieldName,
    overrideIndex
  );

  if (!parsingMessage && !compilationMessage) return;

  return [parsingMessage, compilationMessage].join('\n');
}

function getMessageByKeyFromError(
  errors: CompilationError[] | RuntimeError[] | ParsingError[] | null,
  tableName: string,
  fieldName: string,
  key: 'tableKey' | 'fieldKey' | 'totalKey' | 'applyKey' | 'overrideKey'
): string {
  if (!errors) return '';

  for (const error of errors) {
    if (Object.prototype.hasOwnProperty.call(error, key)) {
      const errorElement = error[key as never];
      const { table, field } = errorElement;

      if (
        escapeTableName(table) === tableName &&
        escapeFieldName(field) === fieldName
      ) {
        return error.message;
      }
    }
  }

  return '';
}

function getTotalErrorMessages(
  errors: CompilationError[] | RuntimeError[] | ParsingError[] | null,
  tableName: string,
  fieldName: string,
  totalRow: number
): string | undefined {
  if (!errors) return '';

  const key = 'totalKey';

  for (const error of errors) {
    if (Object.prototype.hasOwnProperty.call(error, key)) {
      const errorElement = error[key];
      const { table, field, number } = errorElement as TotalKey;

      if (table === tableName && field === fieldName && number === totalRow) {
        return error.message;
      }
    }
  }

  return '';
}

function getOverrideErrorMessages(
  errors: CompilationError[] | RuntimeError[] | ParsingError[] | null,
  tableName: string,
  fieldName: string,
  overrideIndex: number
): string | undefined {
  if (!errors) return '';

  const key = 'overrideKey';

  for (const error of errors) {
    if (Object.prototype.hasOwnProperty.call(error, key)) {
      const errorElement = error[key];
      const { table, field, row } = errorElement as OverrideKey;

      if (table === tableName && field === fieldName && row === overrideIndex) {
        return error.message;
      }
    }
  }

  return '';
}
