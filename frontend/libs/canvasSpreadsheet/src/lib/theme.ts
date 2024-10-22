import { AppTheme } from '@frontend/common';

import { FontColorName, FontFamilies } from './setup';
import { Theme } from './types';

export const lightThemeColors = {
  bgAccentPrimary: 0x843ef3,
  bgAccentTertiary: 0x2764d9,
  bgAccentTertiaryAlpha: 0xe7edf9,
  bgError: 0xf3d6d8,
  bgGridColoredCell: 0xf3f4f6,
  bgGridHeader: 0xb7bdc3,
  bgInverted: 0x222932,
  bgLayer1: 0xfcfcfc,
  bgLayer2: 0xf3f4f6,
  bgLayer4: 0xdde1e6,
  textInverted: 0xf3f4f6,
  textPrimary: 0x141a23,
  textSecondary: 0x7f8792,
  strokeAccentPrimary: 0x843ef3,
  strokeAccentSecondary: 0x009d9f,
  strokeError: 0xae2f2f,
  strokeGrid: 0xdde1e6,
  strokeGridMain: 0xd4d4d4,
  strokeSecondary: 0xb7bdc3,
  dndBorderColor: 0xf4ce14,
};

export const darkThemeColors = {
  bgAccentPrimary: 0xa972ff,
  bgAccentTertiary: 0x5c8dea,
  bgAccentTertiaryAlpha: 0x121e33,
  bgError: 0x402027,
  bgGridColoredCell: 0x141a23,
  bgGridHeader: 0x4c535d,
  bgInverted: 0xfcfcfc,
  bgLayer1: 0x03070d,
  bgLayer2: 0x141a23,
  bgLayer4: 0x333942,
  textInverted: 0x141a23,
  textPrimary: 0xf3f4f6,
  textSecondary: 0x7f8792,
  strokeAccentPrimary: 0xa972ff,
  strokeAccentSecondary: 0x37babc,
  strokeError: 0xf76464,
  strokeGrid: 0x222932,
  strokeGridMain: 0x2b313b,
  strokeSecondary: 0x4c535d,
  dndBorderColor: 0xf4ce14,
};

export const lightTheme: Theme = {
  themeName: AppTheme.ThemeLight,
  grid: {
    lineColor: lightThemeColors.strokeGridMain,
    bgColor: lightThemeColors.bgLayer1,
  },
  colNumber: {
    borderColor: lightThemeColors.strokeSecondary,
    bgColor: lightThemeColors.bgLayer2,
    bgColorSelected: lightThemeColors.bgLayer4,
    fontColorName: FontColorName.lightTextSecondary,
    fontFamily: FontFamilies.InconsolataRegular,
    resizerHoverColor: lightThemeColors.strokeSecondary,
    resizerActiveColor: lightThemeColors.strokeAccentPrimary,
  },
  rowNumber: {
    bgColor: lightThemeColors.bgLayer2,
    bgColorSelected: lightThemeColors.bgLayer4,
    fontColorName: FontColorName.lightTextSecondary,
    fontFamily: FontFamilies.InconsolataRegular,
  },
  scrollBar: {
    trackColor: lightThemeColors.bgLayer1,
    thumbColor: lightThemeColors.bgLayer4,
    thumbColorHovered: lightThemeColors.textSecondary,
  },
  cell: {
    borderColor: lightThemeColors.strokeSecondary,
    bgColor: lightThemeColors.bgLayer1,
    bgEvenColor: lightThemeColors.bgGridColoredCell,
    tableHeaderBgColor: lightThemeColors.bgGridHeader,
    fieldHeaderBgColor: lightThemeColors.bgLayer4,
    totalBgColor: lightThemeColors.bgAccentTertiaryAlpha,
    tableBorderColor: lightThemeColors.strokeSecondary,
    tableBorderAlpha: 1,
    cellFontColorName: FontColorName.lightTextPrimary,
    cellFontFamily: FontFamilies.InconsolataRegular,
    boldCellFontColorName: FontColorName.lightTextPrimary,
    boldCellFontFamily: FontFamilies.InconsolataBold,
    keyFontColorName: FontColorName.lightTextError,
    keyFontFamily: FontFamilies.InconsolataBold,
    linkFontColorName: FontColorName.lightTextAccent,
    linkFontFamily: FontFamilies.InconsolataRegular,
    resizerHoverColor: lightThemeColors.strokeSecondary,
    resizerActiveColor: lightThemeColors.strokeAccentPrimary,
  },
  selection: {
    bgAlpha: 0.1,
    bgColor: lightThemeColors.bgAccentPrimary,
    borderColor: lightThemeColors.strokeAccentPrimary,
  },
  override: {
    borderColor: lightThemeColors.strokeAccentSecondary,
  },
  error: {
    borderColor: lightThemeColors.strokeError,
  },
  pointClickSelection: {
    alpha: 1,
    color: lightThemeColors.strokeAccentSecondary,
    errorColor: lightThemeColors.strokeError,
    alignment: 0,
  },
  dottedSelection: {
    color: lightThemeColors.strokeAccentPrimary,
    alignment: 0,
    alpha: 1,
  },
  noteLabel: {
    bgColor: lightThemeColors.strokeAccentSecondary,
  },
  diff: {
    bgColor: lightThemeColors.bgAccentTertiary,
  },
  dndSelection: {
    borderColor: lightThemeColors.dndBorderColor,
  },
};

export const darkTheme: Theme = {
  themeName: AppTheme.ThemeDark,
  grid: {
    lineColor: darkThemeColors.strokeGrid,
    bgColor: darkThemeColors.bgLayer1,
  },
  colNumber: {
    borderColor: lightThemeColors.strokeSecondary,
    bgColor: darkThemeColors.bgLayer2,
    bgColorSelected: darkThemeColors.bgLayer4,
    fontColorName: FontColorName.darkTextSecondary,
    fontFamily: FontFamilies.InconsolataRegular,
    resizerHoverColor: darkThemeColors.strokeSecondary,
    resizerActiveColor: darkThemeColors.strokeAccentPrimary,
  },
  rowNumber: {
    bgColor: darkThemeColors.bgLayer2,
    bgColorSelected: darkThemeColors.bgLayer4,
    fontColorName: FontColorName.darkTextSecondary,
    fontFamily: FontFamilies.InconsolataRegular,
  },
  scrollBar: {
    trackColor: darkThemeColors.bgLayer1,
    thumbColor: darkThemeColors.bgLayer4,
    thumbColorHovered: lightThemeColors.textSecondary,
  },
  cell: {
    borderColor: darkThemeColors.strokeSecondary,
    bgColor: darkThemeColors.bgLayer1,
    bgEvenColor: darkThemeColors.bgGridColoredCell,
    tableHeaderBgColor: darkThemeColors.bgGridHeader,
    fieldHeaderBgColor: darkThemeColors.bgLayer4,
    totalBgColor: darkThemeColors.bgAccentTertiaryAlpha,
    tableBorderColor: darkThemeColors.strokeSecondary,
    tableBorderAlpha: 1,
    cellFontColorName: FontColorName.darkTextPrimary,
    cellFontFamily: FontFamilies.InconsolataRegular,
    boldCellFontColorName: FontColorName.darkTextPrimary,
    boldCellFontFamily: FontFamilies.InconsolataBold,
    keyFontColorName: FontColorName.darkTextError,
    keyFontFamily: FontFamilies.InconsolataBold,
    linkFontColorName: FontColorName.darkTextAccent,
    linkFontFamily: FontFamilies.InconsolataRegular,
    resizerHoverColor: darkThemeColors.strokeSecondary,
    resizerActiveColor: darkThemeColors.strokeAccentPrimary,
  },
  selection: {
    bgAlpha: 0.1,
    bgColor: darkThemeColors.bgAccentPrimary,
    borderColor: darkThemeColors.strokeAccentPrimary,
  },
  override: {
    borderColor: darkThemeColors.strokeAccentSecondary,
  },
  error: {
    borderColor: darkThemeColors.strokeError,
  },
  pointClickSelection: {
    alpha: 1,
    color: darkThemeColors.strokeAccentSecondary,
    errorColor: darkThemeColors.strokeError,
    alignment: 0,
  },
  dottedSelection: {
    color: darkThemeColors.strokeAccentPrimary,
    alignment: 0,
    alpha: 1,
  },
  noteLabel: {
    bgColor: darkThemeColors.strokeAccentSecondary,
  },
  diff: {
    bgColor: darkThemeColors.bgAccentTertiary,
  },
  dndSelection: {
    borderColor: darkThemeColors.dndBorderColor,
  },
};

export function getTheme(theme: AppTheme): Theme {
  return theme === 'theme-dark' ? darkTheme : lightTheme;
}
