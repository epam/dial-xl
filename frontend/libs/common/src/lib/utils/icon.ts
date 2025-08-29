export const getColorVar = (colorValue: string | undefined) => {
  return colorValue ? `var(--${colorValue}, currentColor)` : 'currentColor';
};
