import { TotalType } from '../parser';

export function getTotalType(
  tableName: string,
  fieldName: string,
  expression: string
): TotalType | undefined {
  if (!expression) return;

  const functionNames = [
    'SUM',
    'AVERAGE',
    'COUNT',
    'STDEVS',
    'MEDIAN',
    'MODE',
    'MAX',
    'MIN',
  ];

  const trimmedExpression = replaceWhitespaces(expression);

  for (const func of functionNames) {
    const functionCallPattern = replaceWhitespaces(
      `${func}(${tableName}[${fieldName}])`
    );
    const methodCallPattern = replaceWhitespaces(
      `${tableName}[${fieldName}].${func}()`
    );

    if (
      trimmedExpression === functionCallPattern ||
      trimmedExpression === methodCallPattern
    ) {
      return func.toLowerCase() as TotalType;
    }
  }

  return 'custom';
}

function replaceWhitespaces(expression: string): string {
  return expression.replace(/\s+/g, '');
}
