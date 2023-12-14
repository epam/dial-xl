export const getFormulaType = (
  value: string
): 'single_dim' | 'multi_dim' | 'formula' | 'const' => {
  const dimCount = value.split(':').length - 1;
  if (dimCount === 1) return 'single_dim';
  if (dimCount > 1) return 'multi_dim';
  if (value.includes('=')) return 'formula';

  return 'const';
};
