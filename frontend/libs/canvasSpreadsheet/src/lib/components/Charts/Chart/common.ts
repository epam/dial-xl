import { AppTheme } from '@frontend/common';

export const defaultColorPalette = [
  '#5470c6',
  '#91cc75',
  '#fac858',
  '#ee6666',
  '#73c0de',
  '#3ba272',
  '#fc8452',
  '#9a60b4',
  '#ea7ccc',
];

function hashString(str: string): number {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }

  return hash;
}

function stableColorFromLabel(label: string): string {
  const hash = Math.abs(hashString(label));

  // Use a prime multiplier to better distribute hues
  const hue = (hash * 13) % 360;

  // Derive saturation from a different part of hash, ensuring a reasonable range
  const saturation = 50 + ((hash >> 2) % 40); // Results in 50% to 89%

  // Derive lightness from yet another part of the hash for variation
  const lightness = 40 + ((hash >> 4) % 20); // Results in 40% to 59%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function getColor(index: number, label?: string): string {
  if (index < defaultColorPalette.length) {
    return defaultColorPalette[index];
  }

  return stableColorFromLabel(label || `series-${index}`);
}

export function getThemeColors(theme: AppTheme) {
  return {
    textColor: theme === AppTheme.ThemeDark ? '#f3f4f6' : '#141a23',
    bgColor: theme === AppTheme.ThemeDark ? '#222932' : '#fcfcfc',
    borderColor: theme === AppTheme.ThemeDark ? '#222932' : '#dde1e6',
    hoverColor: theme === AppTheme.ThemeDark ? '#333942' : '#dde1e6',
  };
}

export function sortNumericOrText<T extends string>(array: T[]): T[] {
  return array.sort((a, b) => {
    const aNum = Number(a);
    const bNum = Number(b);
    const aIsNumeric = !isNaN(aNum);
    const bIsNumeric = !isNaN(bNum);

    if (aIsNumeric && bIsNumeric) {
      return aNum - bNum;
    }

    return a.localeCompare(b);
  });
}

export function addLineBreaks<T extends string>(array: T[]): string[] {
  return array.map((label) => label?.toString().split(' ').join('\n'));
}
