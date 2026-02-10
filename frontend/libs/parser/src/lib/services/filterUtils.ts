import {
  BinOpExpression,
  ConstNumberExpression,
  ConstStringExpression,
  CurrentFieldExpression,
  Expression,
  FunctionExpression,
  UniOpExpression,
} from '../ast';
import { ParsedConditionFilter } from '../ParsedFilter';
import { FilterOperator, ModifyFilterProps } from '../parser';
import { unescapeValue } from './escapeUtils';
import { updateExpressionFieldName } from './updateExpressionFieldName';

export function getModifiedFilters(
  expression: Expression,
  props: ModifyFilterProps
): Map<string, string[]> {
  const fieldFilters: Map<string, string[]> = new Map();

  function collectFieldFilters(expr: Expression): void {
    if (!expr) return;

    if (expr instanceof BinOpExpression) {
      const leftExpr = expr.left;
      const rightExpr = expr.right;

      let fieldExpr: CurrentFieldExpression | null = null;
      let valueExpr: Expression | null = null;

      if (leftExpr instanceof CurrentFieldExpression) {
        fieldExpr = leftExpr;
        valueExpr = rightExpr;
      } else if (rightExpr instanceof CurrentFieldExpression) {
        fieldExpr = rightExpr;
        valueExpr = leftExpr;
      }

      if (fieldExpr && valueExpr) {
        let expFieldName = fieldExpr.fieldName;
        if (props?.excludeFieldName === expFieldName) return;

        if (props?.oldFieldName === expFieldName && props?.newFieldName) {
          expFieldName = props.newFieldName!;
          updateExpressionFieldName(
            expr,
            props.oldFieldName,
            props.newFieldName
          );
        }

        if (!fieldFilters.has(expFieldName)) {
          fieldFilters.set(expFieldName, []);
        }
        fieldFilters.get(expFieldName)!.push(expr.toString());
      }

      collectFieldFilters(expr.left);
      collectFieldFilters(expr.right);
    } else if (expr instanceof FunctionExpression) {
      // Handle function expressions (e.g., CONTAINS, BETWEEN)
      const args = expr.arguments;

      let fieldExpr: CurrentFieldExpression | null = null;

      for (const arg of args) {
        if (arg instanceof CurrentFieldExpression) {
          fieldExpr = arg;
          break;
        }
      }

      if (fieldExpr) {
        let expFieldName = fieldExpr.fieldName;
        if (props?.excludeFieldName === expFieldName) return;

        if (props?.oldFieldName === expFieldName && props?.newFieldName) {
          expFieldName = props.newFieldName!;
          updateExpressionFieldName(
            expr,
            props.oldFieldName,
            props.newFieldName
          );
        }

        if (!fieldFilters.has(expFieldName)) {
          fieldFilters.set(expFieldName, []);
        }
        fieldFilters.get(expFieldName)!.push(expr.toString());
      }

      args.forEach((arg) => collectFieldFilters(arg));
    } else if (expr instanceof UniOpExpression) {
      // Handle unary expressions (e.g., NOT CONTAINS)
      if (expr.exp instanceof FunctionExpression) {
        const funcExpr = expr.exp;
        const args = funcExpr.arguments[0] as Expression[];

        let fieldExpr: CurrentFieldExpression | null = null;

        for (const arg of args) {
          if (arg instanceof CurrentFieldExpression) {
            fieldExpr = arg;
            break;
          }
        }

        if (fieldExpr) {
          let expFieldName = fieldExpr.fieldName;
          if (props?.excludeFieldName === expFieldName) return;

          if (props?.oldFieldName === expFieldName && props?.newFieldName) {
            expFieldName = props.newFieldName!;
            updateExpressionFieldName(
              expr,
              props.oldFieldName,
              props.newFieldName
            );
          }

          if (!fieldFilters.has(expFieldName)) {
            fieldFilters.set(expFieldName, []);
          }
          fieldFilters.get(expFieldName)!.push(expr.toString());
        }
      }

      collectFieldFilters(expr.exp);
    } else {
      const expressionProps = [
        'left',
        'right',
        'expression',
        'children',
        'arguments',
        'exp',
      ];

      for (const prop of expressionProps) {
        if (Object.prototype.hasOwnProperty.call(expr, prop)) {
          const exprProp = (expr as any)[prop];

          if (prop === 'arguments') {
            for (const arg of exprProp) {
              for (const subExpression of arg) {
                collectFieldFilters(subExpression);
              }
            }
          } else if (Array.isArray(exprProp)) {
            for (const child of exprProp) {
              collectFieldFilters(child);
            }
          } else {
            collectFieldFilters(exprProp);
          }
        }
      }
    }
  }

  collectFieldFilters(expression);

  if (props?.conditionFilter !== undefined && props?.fieldName) {
    if (props.conditionFilter === null) {
      fieldFilters.delete(props.fieldName);
    } else {
      fieldFilters.set(props.fieldName, [props.conditionFilter]);
    }
  }

  return fieldFilters;
}

export function handleBinOpExpression(
  expression: Expression,
  parent: BinOpExpression
): ParsedConditionFilter | undefined {
  const operator = parent.operator;

  const otherSide = parent.left === expression ? parent.right : parent.left;

  const value = extractValueFromExpression(otherSide);

  if (expression instanceof FunctionExpression) {
    const functionName = expression.name.toUpperCase();
    const filterOperator =
      functionName === 'LEFT'
        ? FilterOperator.BeginsWith
        : functionName === 'RIGHT'
        ? FilterOperator.EndsWith
        : undefined;

    if (filterOperator) {
      return {
        operator: filterOperator,
        value,
      };
    }
  } else if (expression instanceof CurrentFieldExpression) {
    return {
      operator,
      value,
    };
  }

  return undefined;
}

export function handleUniOpExpression(
  expression: Expression,
  parent: UniOpExpression
): ParsedConditionFilter | undefined {
  if (parent.uni_op.toUpperCase() !== 'NOT') return undefined;

  if (
    expression instanceof FunctionExpression &&
    expression.name.toUpperCase() === 'CONTAINS'
  ) {
    const value = extractValueFromArguments(
      expression.arguments[0] as Expression[]
    );

    return {
      operator: FilterOperator.NotContains,
      value,
    };
  }

  return undefined;
}

export function handleFunctionExpression(
  expression: FunctionExpression
): ParsedConditionFilter | undefined {
  const functionName = expression.name.toUpperCase();

  if (functionName === 'CONTAINS') {
    const value = extractValueFromArguments(
      expression.arguments[0] as Expression[]
    );

    return {
      operator: FilterOperator.Contains,
      value,
    };
  }

  if (functionName === 'BETWEEN') {
    const values = extractValuesFromArguments(
      expression.arguments[0] as Expression[]
    );

    if (values.length === 2) {
      return {
        operator: FilterOperator.Between,
        value: values[0],
        secondaryValue: values[1],
      };
    }
  }

  return undefined;
}

export function isConstNumberOrStringExpression(
  arg: Expression
): arg is ConstNumberExpression | ConstStringExpression {
  return (
    arg instanceof ConstNumberExpression || arg instanceof ConstStringExpression
  );
}

function extractValueFromExpression(expression: Expression): string {
  if (isConstNumberOrStringExpression(expression)) {
    return unescapeValue(expression.text);
  }

  return '';
}

function extractValuesFromArguments(args: Expression[]): string[] {
  return args
    .filter(isConstNumberOrStringExpression)
    .map((arg) => unescapeValue(arg.text));
}

function extractValueFromArguments(args: Expression[]): string {
  return extractValuesFromArguments(args)[0] || '';
}
