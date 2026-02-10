import {
  AppTheme,
  convertThemeForCanvas,
  getHexColor,
  themesColors,
} from '@frontend/common';

import { FontFamilies } from './setup';
import { Theme } from './types';

function createSpreadsheetTheme(theme: AppTheme): Theme {
  const c = convertThemeForCanvas(themesColors[theme]);

  return {
    themeName: theme,
    grid: {
      lineColor: theme === 'theme-dark' ? c.strokeGrid : c.strokeGridMain,
      bgColor: c.bgLayer1,
    },
    colNumber: {
      borderColor: c.strokeGridMain,
      bgColor: c.bgLayer2,
      bgColorSelected: c.bgLayer4,
      bgColorFullSelected: c.bgAccentPrimaryAlpha,
      bgColorHover: c.bgAccentPrimaryAlpha2,
      fontColor: c.textSecondary,
      fontFamily: FontFamilies.JetBrainsMonoRegular,
      resizerHoverColor: c.strokeSecondary,
      resizerActiveColor: c.strokeAccentPrimary,
    },
    rowNumber: {
      bgColor: c.bgLayer2,
      bgColorSelected: c.bgLayer4,
      bgColorFullSelected: c.bgAccentPrimaryAlpha,
      bgColorHover: c.bgAccentPrimaryAlpha2,
      fontColor: c.textSecondary,
      fontFamily: FontFamilies.JetBrainsMonoRegular,
    },
    scrollBar: {
      trackColor: c.bgLayer1,
      trackStrokeColor: c.strokeGridMain,
      thumbColor: c.bgLayer4,
      thumbColorHovered: c.textSecondary,
    },
    cell: {
      borderColor: c.strokeSecondary,
      bgColor: c.bgLayer1,
      bgEvenColor: c.bgGridColoredCell,
      tableHeaderBgColor: c.bgGridHeader,
      fieldHeaderBgColor: c.bgLayer4,
      totalBgColor: c.bgAccentTertiaryAlphaSolid,
      cellFontColor: c.textPrimary,
      cellFontFamily: FontFamilies.JetBrainsMonoRegular,
      boldCellFontColor: c.textPrimary,
      boldCellFontFamily: FontFamilies.JetBrainsMonoBold,
      keyFontColor: c.textError,
      keyFontFamily: FontFamilies.JetBrainsMonoBold,
      linkFontColor: c.textAccentTertiary,
      linkFontHoverColor: c.textAccentPrimary,
      linkFontFamily: FontFamilies.JetBrainsMonoRegular,
      indexFontColor: c.textAccentSecondary,
      resizerHoverColor: c.strokeSecondary,
      resizerActiveColor: c.strokeAccentPrimary,
    },
    selection: {
      bgAlpha: 0.1,
      bgColor: c.strokeAccentPrimary,
      borderColor: c.strokeAccentPrimary,
      alpha: 1,
      alignment: 0,
    },
    override: {
      borderColor: c.strokeAccentSecondary,
    },
    error: {
      borderColor: c.strokeError,
    },
    pointClickSelection: {
      alpha: 1,
      color: c.strokeAccentSecondary,
      errorColor: c.strokeError,
      alignment: 0,
    },
    dottedSelection: {
      color: c.strokeAccentPrimary,
      alignment: 0,
      alpha: 1,
      rectangleAlpha: 0.07,
    },
    noteLabel: {
      bgColor: c.strokeAccentSecondary,
    },
    highlight: {
      dimmed: {
        bgColor: c.bgLayer2,
        negativeAlpha: 0.5,
        alpha: 1,
        textAlpha: 0.5,
      },
      highlighted: {
        bgColor: c.bgAccentTertiary,
        alpha: 0.17,
        negativeAlpha: 1,
        textAlpha: 1,
      },
    },
    dndSelection: {
      borderColor: c.textWarning,
    },
    hiddenCell: {
      fontColor: c.textSecondary,
      fontFamily: FontFamilies.JetBrainsMonoRegular,
    },
    tableShadow: {
      color: getHexColor(theme === 'theme-dark' ? 'ffffff' : '000000'),
      alpha: 0.6,
      rectangleAlpha: 0.2,
    },
  };
}

export function getTheme(theme: AppTheme): Theme {
  return createSpreadsheetTheme(
    theme === 'theme-dark' ? AppTheme.ThemeDark : AppTheme.ThemeLight,
  );
}
