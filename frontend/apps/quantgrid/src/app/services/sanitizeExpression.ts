export function sanitizeExpression(
  expression: string,
  initialExpression: string
) {
  const sanitizedInitialExpression = initialExpression
    .replaceAll('\n', '')
    .replaceAll('\r', '')
    .trim();

  const sanitizedExpression = expression.trimStart().startsWith('=')
    ? expression
        .trimStart()
        .replace('=', '')
        .replaceAll('\n', '')
        .replaceAll('\r', '')
        .trimStart()
    : expression;

  return sanitizedInitialExpression
    ? sanitizedExpression
    : `= ${sanitizedExpression}`;
}
