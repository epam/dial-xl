import { SheetControl } from '@frontend/canvas-spreadsheet';
import {
  ControlType,
  findFunctionExpressions,
  findTableNameInExpression,
  ParsedSheets,
} from '@frontend/parser';
/**
 * Returns all controls (DROPDOWN, CHECKBOX) in the given sheet.
 * Each control includes table names from table reference expressions in its arguments.
 */
export function getSheetControls(
  parsedSheets: ParsedSheets,
  sheetName: string | null,
): SheetControl[] {
  if (!sheetName) return [];

  const sheet = parsedSheets[sheetName];
  if (!sheet) return [];

  const result: SheetControl[] = [];

  for (const table of sheet.tables) {
    for (const field of table.fields) {
      const expr = field.expression;
      if (!expr) continue;

      const fns = findFunctionExpressions(expr);
      const controlFn = fns.find(
        (f) =>
          (f.name === 'DROPDOWN' || f.name === 'CHECKBOX') &&
          f.arguments.length >= 1,
      );
      if (!controlFn) continue;

      const controlType = controlFn.name.toLowerCase() as ControlType;
      const controlSourcesTables = findTableNameInExpression(controlFn);

      result.push({
        tableName: table.tableName,
        fieldName: field.key.fieldName,
        controlType,
        controlSourcesTables: controlSourcesTables.map((t) => t.tableName),
      });
    }
  }

  return result;
}
