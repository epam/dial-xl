import {
  BinOpExpression,
  Expression,
  FieldReferenceExpression,
  FunctionExpression,
  TableReferenceExpression,
} from '../ast';
import { SheetReader } from '../SheetReader';
import { findFieldExpressionsWithParent } from './findFieldExpressionsWithParent';

export type FieldControlRef = {
  controlTableName: string;
  controlFieldName: string;
};

/**
 * Extracts all control references (table[field]) from a filter expression
 * where the filter for the given field is control-based: [field] = Table[ControlField]
 * or IN([field], Table[ControlField]). Returns an array (possibly empty); when
 * multiple controls are involved, callers should use custom formula mode.
 */
export function getFieldControlRefFromFilter(
  parsedExpression: Expression | undefined,
  fieldName: string,
): FieldControlRef[] {
  if (!parsedExpression) return [];

  const withParents = findFieldExpressionsWithParent(
    parsedExpression,
    fieldName,
  );
  const result: FieldControlRef[] = [];

  for (const { expression, parent } of withParents) {
    if (parent instanceof BinOpExpression && parent.operator === '=') {
      const other = parent.left === expression ? parent.right : parent.left;
      if (
        other instanceof FieldReferenceExpression &&
        other.expression instanceof TableReferenceExpression
      ) {
        result.push({
          controlTableName: other.expression.tableName,
          controlFieldName: SheetReader.stripQuotes(other.fieldName),
        });
      }
    }

    if (
      parent instanceof FunctionExpression &&
      parent.name.toUpperCase() === 'IN'
    ) {
      let args = parent.arguments;
      if (Array.isArray(args)) {
        args = args.flat();
      }
      if (args && args.length >= 2) {
        const second = args[1];
        if (
          second instanceof FieldReferenceExpression &&
          second.expression instanceof TableReferenceExpression
        ) {
          result.push({
            controlTableName: second.expression.tableName,
            controlFieldName: SheetReader.stripQuotes(second.fieldName),
          });
        }
      }
    }
  }

  return result;
}
