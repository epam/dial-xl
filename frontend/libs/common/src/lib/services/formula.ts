export const getFormulaType = (
  value: string
): 'single_dim' | 'multi_dim' | 'formula' | 'const' => {
  const dimCount = stripQuotesBrackets(value).split(':').length - 1;
  if (dimCount === 1) return 'single_dim';
  if (dimCount > 1) return 'multi_dim';
  if (value.includes('=')) return 'formula';

  return 'const';
};

export const stripQuotesBrackets = (str: string): string => {
  return str
    .replace(/(["'])(.*?)(\1)/g, '$1$1')
    .replace(/\[(.*?)]/g, '[]')
    .replace(/\((.*?)\)/g, '()');
};
