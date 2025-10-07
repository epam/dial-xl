import {
  CompilationError,
  EvaluationError,
  getTableFieldLabel,
  OverrideKey,
  ParsingError,
  RuntimeError,
  TotalKey,
} from '@frontend/common';
import {
  escapeFieldName,
  escapeTableName,
  ParsedSheets,
} from '@frontend/parser';

const errorKeyProperties = [
  'fieldKey',
  'totalKey',
  'applyKey',
  'overrideKey',
  'tableKey',
] as const;

type ErrorKeyProperty = (typeof errorKeyProperties)[number];

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
  key: ErrorKeyProperty
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

export function getLabelFromParsingError(error: ParsingError): string {
  if (!error.source.startColumn) {
    return `${error.source.startLine}: `;
  }

  return `${error.source.startLine}:${error.source.startColumn}: `;
}

export function getLabelFromError(error: EvaluationError): string {
  for (const key of errorKeyProperties) {
    if (Object.prototype.hasOwnProperty.call(error, key)) {
      const errorElement = error[key as keyof typeof error] as any;

      if (errorElement?.table) {
        const table = errorElement.table;
        const field = errorElement.field || null;

        return getTableFieldLabel(table, field);
      }
    }
  }

  return '';
}

export function getErrorLocationInfo(
  error: EvaluationError,
  parsedSheets: ParsedSheets
): { tableName: string; fieldName: string | null; sheetName: string } | null {
  for (const key of errorKeyProperties) {
    if (Object.prototype.hasOwnProperty.call(error, key)) {
      const errorElement = error[key as keyof EvaluationError] as any;

      if (errorElement?.table) {
        const tableName = errorElement.table;
        const fieldName = errorElement.field || null;

        for (const [sheetName, sheet] of Object.entries(parsedSheets)) {
          const tableExists = sheet.tables?.some(
            (t) => t.tableName === tableName
          );

          if (tableExists) {
            return {
              tableName,
              fieldName,
              sheetName,
            };
          }
        }

        return {
          tableName,
          fieldName,
          sheetName: '',
        };
      }
    }
  }

  return null;
}

export function calculateSheetErrorPosition(
  sheetContent: string,
  text: string,
  end: number
) {
  const code = sheetContent.substring(0, end + 1);
  const lines = code.split('\n');
  const line = lines.length;
  const fieldLine = lines.at(-1);

  const startColumn = fieldLine?.includes(text)
    ? fieldLine.indexOf(text) + 1
    : 0;
  const endColumn = startColumn + text.length + 1;

  return {
    line,
    startColumn,
    endColumn,
  };
}
