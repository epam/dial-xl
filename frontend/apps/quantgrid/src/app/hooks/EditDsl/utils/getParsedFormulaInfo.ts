import {
  FieldsReferenceExpression,
  findFunctionExpressions,
  SheetReader,
} from '@frontend/parser';

interface ParsedFormulaInfo {
  isFieldReferenceFormula: boolean;
  isInputFunction: boolean;
  isPivotFunction: boolean;
}

export const getParsedFormulaInfo = (formula: string): ParsedFormulaInfo => {
  try {
    const parsed = SheetReader.parseFormula(formula);

    const isFieldReferenceFormula =
      parsed.expression instanceof FieldsReferenceExpression;

    const fns = findFunctionExpressions(parsed);

    const isInputFunction = fns.some((f) => f.name === 'INPUT');
    const isPivotFunction = fns.some((f) => f.name === 'PIVOT');

    return { isFieldReferenceFormula, isInputFunction, isPivotFunction };
  } catch {
    return {
      isFieldReferenceFormula: false,
      isInputFunction: false,
      isPivotFunction: false,
    };
  }
};
