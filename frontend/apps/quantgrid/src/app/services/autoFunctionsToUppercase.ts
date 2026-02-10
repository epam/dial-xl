import { FunctionInfo } from '@frontend/common';
import { SheetReader } from '@frontend/parser';

import { functionsToUppercase } from './functionsToUppercase';

export type ExpressionToUpdate = {
  expression: string;
  start: number;
  end: number;
};

export function autoFunctionsToUppercase(
  dsl: string,
  functions: FunctionInfo[]
) {
  if (!dsl || functions.length === 0) return dsl;

  try {
    const parsedSheet = SheetReader.parseSheet(dsl);
    const { tables } = parsedSheet;
    const expressionsToUpdate: ExpressionToUpdate[] = [];

    tables.forEach((table) => {
      const { fields } = table;
      fields.forEach((field) => {
        const { expressionMetadata } = field;

        if (expressionMetadata?.text) {
          const { text, start, end } = expressionMetadata;
          const expression = functionsToUppercase(text, functions);

          if (text !== expression) {
            expressionsToUpdate.push({
              expression,
              start,
              end,
            });
          }
        }
      });
    });

    if (expressionsToUpdate.length === 0) return dsl;

    const reversedExpressionsByPlacement = expressionsToUpdate.sort((a, b) => {
      return b.start - a.start;
    });

    let updatedDsl = dsl;

    reversedExpressionsByPlacement.forEach((e) => {
      updatedDsl =
        updatedDsl.substring(0, e.start) +
        e.expression +
        updatedDsl.substring(e.end + 1);
    });

    return updatedDsl;
  } catch (e) {
    return dsl;
  }
}
