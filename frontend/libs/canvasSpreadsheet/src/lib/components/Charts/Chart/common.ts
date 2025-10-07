import { AppTheme, stableColorFromLabel } from '@frontend/common';

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

export function isHtmlColor(color: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/i.test(color.trim());
}
