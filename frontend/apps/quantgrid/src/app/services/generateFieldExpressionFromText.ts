import { ParsedTable, SheetReader } from '@frontend/parser';

import { createUniqueName } from './createUniqueName';

const defaultFieldName = 'Field1';

export const generateFieldExpressionFromText = (
  fieldText: string,
  targetTable: ParsedTable | null = null
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

    if (!sourceFieldNameWithKeywords) {
      fieldName = fieldNameInBrackets
        ? SheetReader.stripQuotes(sourceFieldName) || defaultFieldName
        : sourceFieldName || defaultFieldName;
      const checkedFieldName = createUniqueName(fieldName, existingFieldNames);
      const fieldDsl = `[${checkedFieldName}] = ${parts[1].trim()}`;

      return { fieldName, fieldDsl };
    }

    const fieldDsl = `${sourceFieldName} = ${parts[1].trim()}`;

    return { fieldName, fieldDsl };
  }

  if (parts.length === 1) {
    fieldName = createUniqueName(parts[0], existingFieldNames);
    const fieldDsl = `[${fieldName}] = NA`;

    return { fieldName, fieldDsl };
  }

  return { fieldName, fieldDsl: fieldText };
};
