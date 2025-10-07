export const getColorVar = (colorValue: string | undefined) => {
  return colorValue
    ? `var(--color-${colorValue}, currentColor)`
    : 'currentColor';
};
