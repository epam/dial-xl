import {
  ControlType,
  FieldsReferenceExpression,
  findFunctionExpressions,
  SheetReader,
} from '@frontend/parser';

interface ParsedFormulaInfo {
  isFieldReferenceFormula: boolean;
  isInputFunction: boolean;
  isImportFunction: boolean;
  isPivotFunction: boolean;
  isGroupByFunction: boolean;
}

export const getParsedFormulaInfo = (formula: string): ParsedFormulaInfo => {
  try {
    const parsed = SheetReader.parseFormula(formula);

    const isFieldReferenceFormula =
      parsed.expression instanceof FieldsReferenceExpression;

    const fns = findFunctionExpressions(parsed);

    const isInputFunction = fns.some((f) => f.name === 'INPUT');
    const isPivotFunction = fns.some((f) => f.name === 'PIVOT');
    const isImportFunction = fns.some((f) => f.name === 'IMPORT');
    const isGroupByFunction = fns.some((f) => f.name === 'GROUPBY');

    return {
      isFieldReferenceFormula,
      isInputFunction,
      isImportFunction,
      isPivotFunction,
      isGroupByFunction,
    };
  } catch {
    return {
      isFieldReferenceFormula: false,
      isInputFunction: false,
      isImportFunction: false,
      isPivotFunction: false,
      isGroupByFunction: false,
    };
  }
};

// Lightweight check to see if the formula contains INPUT("files/...
// For usage in places like GridBuilder to avoid parsing and search for function expressions
export const isInputFormula = (formula: string): boolean => {
  if (!formula) return false;

  return /\bINPUT\s*\(\s*"files\//.test(formula);
};

// Lightweight check to see if the formula contains IMPORT("..."
// Matches patterns like IMPORT("my_source/table", 2)
export const isImportFormula = (formula: string): boolean => {
  if (!formula) return false;

  return /\bIMPORT\s*\(\s*"[^"]+"\s*,\s*\d+\s*\)/.test(formula);
};

// Lightweight check to see if the formula is a control formula
export const getControlType = (formula: string): ControlType | undefined => {
  if (!formula) return;

  const match = formula.match(/\b(DROPDOWN|CHECKBOX)\s*\(/);
  if (!match) return;

  return match[1].toLowerCase() as ControlType;
};
