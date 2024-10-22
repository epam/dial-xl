import { findFieldNameInExpression, SheetReader } from '@frontend/parser';

import { TableFields } from './getTableFields';

export function autoFixFieldNames(
  expression: string,
  currentTableName: string,
  tableFields: TableFields
): string {
  if (!expression) return expression;

  try {
    const parsedExpression = SheetReader.parseFormula(expression);
    const expressionFields = findFieldNameInExpression(parsedExpression);

    for (const field of expressionFields) {
      const { start } = field;
      const fieldName = field.fieldName
        .replaceAll('[', '')
        .replaceAll(']', '')
        .toLowerCase();
      const tableName = field.tableName || currentTableName;

      if (!Object.keys(tableFields).includes(tableName)) {
        continue;
      }

      const correctFieldName = tableFields[tableName].find(
        (f) => f.toLowerCase() === fieldName
      );

      if (correctFieldName) {
        expression =
          expression.substring(0, start) +
          `[${correctFieldName}]` +
          expression.substring(start + correctFieldName.length + 2);
      }
    }
  } catch (e) {
    return expression;
  }

  return expression;
}
