import { FunctionInfo } from '@frontend/common';
import { ParsedSheets, ParsedTable, SheetReader } from '@frontend/parser';

import { autoFixSingleExpression } from './autoFixSingleExpression';
import { createUniqueName } from './createUniqueName';

export const generateFieldExpressionFromText = (
  fieldText: string,
  targetTable: ParsedTable | null = null,
  functions: FunctionInfo[],
  parsedSheets: ParsedSheets,
  currentTableName = ''
): { fieldNames: string[]; expression: string | null } => {
  const parts = fieldText.trim().split('=');
  const existingFieldNames = targetTable
    ? targetTable.fields.map((f) => f.key.fieldName)
    : [];

  if (parts.length > 2) {
    parts[1] = parts.slice(1).join('=');
    parts.splice(2);
  }

  if (parts.length === 2) {
    const lhs = parts[0].trim();
    const expression = parts[1].trim()
      ? autoFixSingleExpression(
          parts[1].trim(),
          functions,
          parsedSheets,
          currentTableName
        )
      : '';

    const fieldNames = extractFieldNames(lhs, existingFieldNames);

    return { fieldNames, expression };
  }

  if (parts.length === 1) {
    const fieldNames = extractFieldNames(parts[0], existingFieldNames);

    return { fieldNames, expression: null };
  }

  return { fieldNames: [], expression: null };
};

const extractFieldNames = (src: string, existing: string[]): string[] => {
  const names: string[] = [];
  const existingNames = new Set<string>(existing);

  src.split(',').forEach((raw) => {
    let name = raw.replace(/\b(key|dim)\b/gi, '').trim();
    if (!name) return;

    name = /^\[.*]$/.test(name) ? SheetReader.stripQuotes(name)! : name;
    const unique = createUniqueName(name, [...existingNames]);
    existingNames.add(unique);
    names.push(unique);
  });

  return names;
};
