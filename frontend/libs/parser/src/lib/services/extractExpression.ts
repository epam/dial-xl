export function extractExpression(expression: string | undefined): string {
  if (!expression) return '';

  const regex = /^ERR\(["']?(.+?)["']?\)$/;
  const match = expression.match(regex);

  return match ? match[1] : expression;
}
