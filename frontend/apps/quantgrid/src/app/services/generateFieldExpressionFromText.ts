import { defaultFieldName, FunctionInfo } from '@frontend/common';
import { ParsedSheets, ParsedTable, SheetReader } from '@frontend/parser';

import { autoFixSingleExpression } from './autoFixSingleExpression';
import { createUniqueName } from './createUniqueName';

export const generateFieldExpressionFromText = (
  fieldText: string,
  targetTable: ParsedTable | null = null,
  functions: FunctionInfo[],
  parsedSheets: ParsedSheets,
  currentTableName = ''
) => {
  let fieldName = '';
  const parts = fieldText.trim().split('=');
  const existingFieldNames = targetTable
    ? targetTable.fields.map((f) => f.key.fieldName)
    : [];

  if (parts.length > 2) {
    parts[1] = parts.slice(1).join('=');
    parts.splice(2);
  }

  if (parts.length === 2) {
    const sourceFieldName = parts[0].trim();
    const fieldNameInBrackets = /^\[.*]$/.test(sourceFieldName);
    const sourceFieldNameWithKeywords = /key|dim/gi.test(sourceFieldName);
    const expression = parts[1].trim()
      ? autoFixSingleExpression(
          parts[1].trim(),
          functions,
          parsedSheets,
          currentTableName
        )
      : '';

    if (!sourceFieldNameWithKeywords) {
      fieldName = fieldNameInBrackets
        ? SheetReader.stripQuotes(sourceFieldName) || defaultFieldName
        : sourceFieldName || defaultFieldName;
      const uniqueFieldName = createUniqueName(fieldName, existingFieldNames);
      const fieldDsl = expression
        ? `[${uniqueFieldName}] = ${expression}`
        : `[${uniqueFieldName}]`;

      return { fieldName: uniqueFieldName, fieldDsl, expression };
    }

    const fieldDsl = `${sourceFieldName} = ${expression}`;

    return { fieldName, fieldDsl, expression };
  }

  if (parts.length === 1) {
    fieldName = createUniqueName(parts[0], existingFieldNames);
    const fieldDsl = `[${fieldName}]`;

    return { fieldName, fieldDsl, expression: null };
  }

  return { fieldName, fieldDsl: fieldText, expression: null };
};
