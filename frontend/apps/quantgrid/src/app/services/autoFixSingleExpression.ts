import { FunctionInfo } from '@frontend/common';
import { checkAndWrapExpression, ParsedSheets } from '@frontend/parser';

import { autoFixFieldNames } from './autoFixFieldNames';
import { autoFixTableNames } from './autoFixTableNames';
import { functionsToUppercase } from './functionsToUppercase';
import { getTableFields } from './sheetUtils';

export function autoFixSingleExpression(
  expression: string,
  functions: FunctionInfo[],
  parsedSheets: ParsedSheets,
  currentTableName = ''
) {
  if (!expression) return expression;

  const tableFields = getTableFields(parsedSheets);

  const trimmedExpression = expression.trimStart().startsWith('=')
    ? expression.replace('=', '').trimStart()
    : expression;

  let updatedExpression = functionsToUppercase(trimmedExpression, functions);
  updatedExpression = autoFixTableNames(updatedExpression, tableFields);
  updatedExpression = autoFixFieldNames(
    updatedExpression,
    currentTableName,
    tableFields
  );
  updatedExpression = checkAndWrapExpression(updatedExpression);

  return updatedExpression;
}
