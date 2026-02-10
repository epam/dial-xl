import { compareTableNames } from '@frontend/common';
import {
  escapeTableName,
  findTableNameInExpression,
  SheetReader,
} from '@frontend/parser';

import { TableFields } from './sheetUtils';

export function autoFixTableNames(
  expression: string,
  tableFields: TableFields
): string {
  if (!expression) return expression;

  try {
    const parsedExpression = SheetReader.parseFormula(expression);

    const expressionTables = findTableNameInExpression(parsedExpression);
    const tableNames = Object.keys(tableFields).map((t) => t.toLowerCase());

    for (const table of expressionTables) {
      const { start } = table;
      const tableName = table.tableName.toLowerCase();

      if (tableNames.some((t) => compareTableNames(t, tableName))) {
        const correctTableName = Object.keys(tableFields).find((t) =>
          compareTableNames(t.toLowerCase(), tableName)
        );

        if (!correctTableName) continue;

        expression =
          expression.substring(0, start) +
          escapeTableName(correctTableName) +
          expression.substring(start + tableName.length);
      }
    }
  } catch (e) {
    return expression;
  }

  return expression;
}
