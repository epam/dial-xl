import {
  ConstNumberExpression,
  Expression,
  findFunctionExpressions,
  Missing,
  SheetReader,
} from '@frontend/parser';

export function bumpAIFunctionVersion(formula: string): string | undefined {
  if (!formula) return formula;

  try {
    const parsed = SheetReader.parseFormula(formula);
    if (parsed.errors.length > 0) {
      return formula;
    }

    const aiFunctions = findFunctionExpressions(parsed.expression).filter(
      (fn) => fn.name === 'AILIST' || fn.name === 'AIVALUE'
    );

    if (aiFunctions.length === 0) {
      return formula;
    }

    const sortedFunctions = aiFunctions.sort(
      (a, b) => (b.globalOffsetStart ?? 0) - (a.globalOffsetStart ?? 0)
    );

    let result = formula;

    for (const fn of sortedFunctions) {
      const versionArgIndex = 1;

      if (fn.arguments.length === 0) {
        return undefined;
      }

      const args = fn.arguments[0] as Expression[];
      const lastArg = args[versionArgIndex];

      if (lastArg instanceof Missing) {
        const newFunctionText =
          result.slice(fn.globalOffsetStart, lastArg.span.from) +
          ' 1' +
          result.slice(lastArg.span.to, fn.globalOffsetEnd + 1);

        result =
          result.slice(0, fn.globalOffsetStart) +
          newFunctionText +
          result.slice(fn.globalOffsetEnd + 1);

        continue;
      }

      if (!(lastArg instanceof ConstNumberExpression)) {
        return;
      }

      const currentVersion = parseInt(lastArg.text, 10);
      const newVersion = isNaN(currentVersion) ? 1 : currentVersion + 1;

      const newFunctionText =
        result.slice(fn.globalOffsetStart, lastArg.globalOffsetStart) +
        newVersion.toString() +
        result.slice(lastArg.globalOffsetEnd + 1, fn.globalOffsetEnd + 1);

      result =
        result.slice(0, fn.globalOffsetStart) +
        newFunctionText +
        result.slice(fn.globalOffsetEnd + 1);
    }

    return result;
  } catch {
    return formula;
  }
}
