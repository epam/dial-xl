import isEqual from 'react-fast-compare';
import yaml from 'yaml';

import {
  Expression,
  FunctionExpression,
  newLine,
  overrideKeyword,
  QueryRowExpression,
  SheetReader,
} from '@frontend/parser';

import { ExecutableFunc } from '../migration-executor';

const functionNames = [
  'PERIODSERIES',
  'FILTER',
  'SORTBY',
  'UNIQUEBY',
  'INDEX',
  'MINBY',
  'MAXBY',
  'FIRST',
  'LAST',
  'CORREL',
  'RECALL',
  'PIVOT',
  'UNPIVOT',
];

function findFunctionExpressions(
  expression: Expression,
  expressionText: string,
  result: FunctionExpression[] = []
): FunctionExpression[] {
  if (!expression) {
    return result;
  }

  if (expression instanceof FunctionExpression) {
    result.push(expression);
  }

  const expressionProps = ['arguments', 'left', 'right', 'expression', 'exp'];

  expressionProps.forEach((prop) => {
    if (Object.prototype.hasOwnProperty.call(expression, prop)) {
      const expressionProp = (expression as any)[prop];
      if (prop === 'arguments') {
        for (const arg of expressionProp) {
          for (const subExpression of arg) {
            if (
              (expression instanceof FunctionExpression &&
                expression.name === 'PIVOT') ||
              (expression instanceof FunctionExpression &&
                expression.name === 'UNPIVOT')
            )
              continue;

            findFunctionExpressions(subExpression, expressionText, result);
          }
        }
      } else {
        findFunctionExpressions(expressionProp, expressionText, result);
      }
    }
  });

  return result;
}

function findDollarTableNameExpression(
  expression: Expression,
  result: { start: number; stop: number }[],
  isInitial = false
): { start: number; stop: number }[] {
  if (!expression) {
    return result;
  }

  if (
    expression instanceof FunctionExpression &&
    functionNames.includes(expression.name) &&
    !isInitial
  ) {
    return result;
  }

  if (expression instanceof QueryRowExpression) {
    result.push({
      start: expression.globalOffsetStart,
      stop: expression.globalOffsetEnd,
    });
  }

  const expressionProps = ['arguments', 'left', 'right', 'expression', 'exp'];

  expressionProps.forEach((prop) => {
    if (Object.prototype.hasOwnProperty.call(expression, prop)) {
      const expressionProp = (expression as any)[prop];
      if (prop === 'arguments') {
        for (const arg of expressionProp) {
          for (const subExpression of arg) {
            if (
              (expression instanceof FunctionExpression &&
                expression.name === 'PIVOT') ||
              (expression instanceof FunctionExpression &&
                expression.name === 'UNPIVOT')
            )
              continue;

            findDollarTableNameExpression(subExpression, result);
          }
        }
      } else {
        findDollarTableNameExpression(expressionProp, result);
      }
    }
  });

  return result;
}

const getReplacements = (
  expression: string
): {
  newValue: string;
  expr: { start: number; stop: number };
}[] => {
  let formula;
  try {
    formula = SheetReader.parseFormula(expression);
  } catch {
    throw new Error('field_parsing_errors');
  }

  if (formula.errors.length > 0) {
    throw new Error('field_parsing_errors');
  }
  const functionExpressions = findFunctionExpressions(formula, expression);
  let results: { newValue: string; expr: { start: number; stop: number } }[] =
    [];

  const filteredFunctionExpressions = functionExpressions.filter((funcExpr) =>
    functionNames.includes(funcExpr.name)
  );
  for (const functionExpression of filteredFunctionExpressions) {
    const res = findDollarTableNameExpression(functionExpression, [], true);
    const funcArg = functionExpression.arguments[0][0];
    let contextExpression =
      funcArg.globalOffsetStart !== undefined &&
      funcArg.globalOffsetEnd !== undefined &&
      expression.slice(funcArg.globalOffsetStart, funcArg.globalOffsetEnd + 1);

    if (contextExpression && contextExpression.includes('$')) {
      const repl = getReplacements(contextExpression);

      const localReplacements = repl.map((expr) => ({
        newValue: expr.newValue,
        start: expr.expr.start,
        end: expr.expr.start + 1,
      }));

      const newContent = replaceContent(contextExpression, localReplacements);

      contextExpression = newContent;
    }

    if (!contextExpression) {
      continue;
    }

    // check for parsing errors in new value
    let parsedContextExpression;
    try {
      parsedContextExpression = SheetReader.parseFormula(contextExpression);
    } catch {
      throw new Error(`new_field_parsing_errors ${contextExpression}`);
    }
    if (parsedContextExpression.errors.length > 0) {
      throw new Error(`new_field_parsing_errors ${contextExpression}`);
    }

    results = results.concat(
      res.map((tableExpr) => {
        return {
          newValue: contextExpression,
          expr: {
            start: tableExpr.start,
            stop: tableExpr.stop,
          },
        };
      })
    );
  }

  return results;
};

function replaceContent(
  str: string,
  replacements: { newValue: string; start: number; end: number }[]
) {
  let result = str;
  replacements.sort((a, b) => b.start - a.start); // sort in descending order to avoid conflicts.
  for (const { newValue, start, end } of replacements) {
    result = result.substring(0, start) + newValue + result.substring(end);
  }

  return result;
}

export const updateSheetContent = (
  sheetContent: string,
  additionalContext: { fileName: string; sheetName: string } = {
    fileName: 'test file name',
    sheetName: 'test sheet name',
  }
): string => {
  const parsedSheet = SheetReader.parseSheet(sheetContent);

  const results: {
    newValue: string;
    start: number;
    end: number;
  }[] = [];

  for (const table of parsedSheet.tables) {
    for (const field of table.fields) {
      if (
        !field.expressionMetadata ||
        !field.expressionMetadata.text.includes('$')
      )
        continue;

      const fieldName = sheetContent.substring(
        field.dslFieldNamePlacement.start,
        field.dslFieldNamePlacement.end
      );

      const expressionText = field.expressionMetadata.text;

      try {
        const expressions = getReplacements(expressionText);
        const localReplacements = expressions.map((expr) => ({
          newValue: expr.newValue,
          start: expr.expr.start,
          end: expr.expr.start + 1,
        }));

        const newContent = replaceContent(expressionText, localReplacements);
        if (newContent.includes('$')) {
          if (
            !newContent.includes('PIVOT') &&
            !newContent.includes('SUBSTITUTE')
          ) {
            console.error(`After field replacement still have $`, {
              ...additionalContext,
              table: table.tableName,
              fieldName,
            });
            throw new Error('field_still_$_content');
          }
        }
        for (const expr of localReplacements) {
          results.push({
            newValue: expr.newValue,
            start: expr.start + field.expressionMetadata.start,
            end: expr.end + field.expressionMetadata.start,
          });
        }
      } catch (e) {
        console.error(
          `Error during field parsing ${sheetContent.substring(
            field.dslFieldNamePlacement.start,
            field.dslFieldNamePlacement.end
          )} of sheet ${additionalContext.sheetName} of file ${
            additionalContext.fileName
          }\n${e.message}`
        );
      }
    }

    const override = table.overrides;
    const overridePlacement = table.dslOverridePlacement;

    if (override) {
      const resultedRows = [];
      let isOverrideRequiredToReplaced = false;
      override.overrideRows.forEach((overrideRow, index) => {
        const entries = Object.entries(overrideRow);
        const updatedRow = overrideRow;
        for (const [key, overrideValue] of entries) {
          if (typeof overrideValue === 'string') {
            if (!overrideValue.includes('$')) continue;

            isOverrideRequiredToReplaced = true;
            const replacements = getReplacements(overrideValue);

            if (replacements.length) {
              const localReplacements = replacements.map((expr) => ({
                newValue: expr.newValue,
                start: expr.expr.start,
                end: expr.expr.start + 1,
              }));

              const result = replaceContent(overrideValue, localReplacements);
              if (result.includes('$')) {
                if (
                  !result.includes('PIVOT') &&
                  !result.includes('SUBSTITUTE')
                ) {
                  console.error(`After override replacement still have $`, {
                    ...additionalContext,
                    table: table.tableName,
                    fieldName: 'override',
                  });
                  throw new Error('override_still_$_content');
                }
              }

              updatedRow[key] = result;
            }
          }
        }

        resultedRows[index] = updatedRow;
      });

      if (!isOverrideRequiredToReplaced) continue;

      override.overrideRows = resultedRows;

      const resultedOverrideDsl = override.convertToDsl();
      const resultedReplacement = {
        newValue: overrideKeyword + newLine + resultedOverrideDsl,
        start: overridePlacement.startOffset,
        end: overridePlacement.stopOffset,
      };

      results.push(resultedReplacement);
    }
  }

  return replaceContent(sheetContent, results);
};

export const fromDollarSignToFunctionName: ExecutableFunc = async (
  content: string,
  additionalParams: {
    qgAccessToken: string;
    fileKey: string;
    isTestMigration?: boolean;
  }
) => {
  if (!additionalParams.qgAccessToken) {
    throw new Error('no_qg_access_token_presented');
  }

  const data: Record<string, string> = yaml.parse(content);

  const body = JSON.stringify({
    compileWorksheetsRequest: {
      worksheets: data,
    },
  });
  const res = await fetch('http://localhost:8080/v1/compile', {
    method: 'post',
    body,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${additionalParams.qgAccessToken}`,
    },
  });

  if (!res.ok) {
    const resText = await res.text();

    console.error(
      `Error while getting compilation information before migration, ${res.status} - ${resText}`
    );

    throw new Error(
      `Error while getting compilation information before migration, ${res.status} - ${resText}`
    );
  }

  const json = await res.json();
  const beforeCompilationErrors = json.compileResult.compilationErrors;

  // Migration data
  for (const sheetName in data) {
    const sheetContent = data[sheetName];
    let updatedSheetContent = sheetContent;

    if (sheetContent.includes('$')) {
      let newValue = '';

      newValue = updateSheetContent(sheetContent, {
        fileName: additionalParams.fileKey,
        sheetName,
      });

      updatedSheetContent = newValue;
    }

    data[sheetName] = updatedSheetContent;
  }

  const updatedBody = JSON.stringify({
    compileWorksheetsRequest: {
      worksheets: data,
    },
  });
  const updatedRes = await fetch('http://localhost:8080/v1/compile', {
    method: 'post',
    body: updatedBody,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${additionalParams.qgAccessToken}`,
    },
  });

  if (!updatedRes.ok) {
    const resText = await updatedRes.text();
    console.error(
      `Error while getting compilation information after migration, ${updatedRes.status} - ${resText}`
    );

    throw new Error(
      `Error while getting compilation information after migration, ${updatedRes.status} - ${resText}`
    );
  }
  const updatedJson = await updatedRes.json();
  const afterCompilationErrors = updatedJson.compileResult.compilationErrors;

  afterCompilationErrors.forEach(({ fieldKey }) => {
    const isPresentedBefore = beforeCompilationErrors.some((before) =>
      isEqual(before.fieldKey, fieldKey)
    );

    if (!isPresentedBefore) {
      const message = `new_compilation_error, \nfile: ${
        additionalParams.fileKey
      }\nbeforeCompilationErrors: ${JSON.stringify(
        beforeCompilationErrors
      )},\nafterCompilationErrors: ${JSON.stringify(afterCompilationErrors)}`;

      if (additionalParams.isTestMigration) {
        console.error(message);
      } else {
        throw new Error(message);
      }
    }
  });

  return yaml.stringify(data);
};
