import { AppTheme } from '../types';

export const themeColors: Record<AppTheme, Record<string, string>> = {
  [AppTheme.ThemeLight]: {
    bgAccentPrimary: 'rgba(132, 62, 243)',
    bgAccentPrimaryAlpha: 'rgba(132, 62, 243, 0.1)',
    bgAccentPrimaryAlphaRGB: '#843EF319',
    bgAccentPrimaryAlpha2: 'rgba(169, 114, 255, 0.2)',
    bgAccentSecondary: '#009d9f',
    bgAccentSecondaryAlpha: 'rgba(0,157,159, 0.1)',
    bgAccentTertiary: '#2764d9',
    bgAccentTertiaryAlpha: 'rgba(39,100,217, 0.1)',
    bgAccentTertiaryAlphaSolid: '#e7edf9',
    bgError: '#f3d6d8',
    bgGridAccentPrimaryAlpha: 'rgba(132, 62, 243, 0.1)',
    bgGridField: '#dde1e6',
    bgGridHeader: '#b7bdc3',
    bgGridColoredCell: '#f3f4f6',
    bgGridInverted: '#222932',
    bgGridLayerMain: '#fcfcfc',
    bgInverted: '#222932',
    bgLayer0: '#fcfcfc',
    bgLayer1: '#fcfcfc',
    bgLayer2: '#f3f4f6',
    bgLayer3: '#fcfcfc',
    bgLayer4: '#dde1e6',
    bgLayer5: '#b7bdc3',
    bgLayer4Inverted: '#333942',
    bgScrollbarHover: '#97979f',
    controlsBgAccentHover: '#843ef3',
    controlsBgAccent: '#9656fc',
    controlsBgAccentHoverSecondary: '#009d9f',
    controlsBgAccentSecondary: '#1CACAE',
    controlsBgDisable: '#7f8792',
    controlsTextDisable: '#c3c9d0',
    controlsTextPermanent: '#fcfcfc',
    strokeAccentPrimary: '#843ef3',
    strokeAccentSecondary: '#009d9f',
    strokeAccentTertiary: '#2764d9',
    strokeError: '#ae2f2f',
    strokeGridAccentPrimary: '#843ef3',
    strokeGridError: '#ae2f2f',
    strokeGridMain: '#d4d4d4',
    strokeGridTable: '#b7bdc3',
    strokeGrid: '#dde1e6',
    strokeHoverFocus: '#141a23',
    strokeHover: '#141a23',
    strokePrimary: '#dde1e6',
    strokeSecondary: '#b7bdc3',
    strokeTertiary: '#dde1e6',
    strokeTertiaryInverted: '#03070d',
    textAccentPrimary: '#843ef3',
    textAccentSecondary: '#009d9f',
    textAccentTertiary: '#2764d9',
    textError: '#ae2f2f',
    textGridPrimary: '#000000',
    textInverted: '#f3f4f6',
    textPrimary: '#141a23',
    textSecondary: '#7f8792',
    textWarning: '#daae14',
    warningInverted: '#f4ce46',
  },
  [AppTheme.ThemeDark]: {
    bgAccentPrimary: 'rgba(169, 114, 255)',
    bgAccentPrimaryAlpha: 'rgba(169, 114, 255, 0.17)',
    bgAccentPrimaryAlphaRGB: '#A972FF2B',
    bgAccentPrimaryAlpha2: 'rgba(132, 62, 243, 0.35)',
    bgAccentSecondary: '#37babc',
    bgAccentSecondaryAlpha: 'rgba(55,186,188, 0.15)',
    bgAccentTertiary: '#5c8dea',
    bgAccentTertiaryAlpha: 'rgba(92,141,234, 0.17)',
    bgAccentTertiaryAlphaSolid: '#121e33',
    bgError: '#402027',
    bgGridAccentPrimaryAlpha: 'rgba(169, 114, 255, 0.17)',
    bgGridField: '#333942',
    bgGridHeader: '#4c535d',
    bgGridColoredCell: '#141a23',
    bgGridInverted: '#fcfcfc',
    bgGridLayerMain: '#03070d',
    bgInverted: '#fcfcfc',
    bgLayer0: '#000',
    bgLayer1: '#03070D',
    bgLayer2: '#141a23',
    bgLayer3: '#222932',
    bgLayer4: '#333942',
    bgLayer5: '#4c535d',
    bgLayer4Inverted: '#dde1e6',
    bgScrollbarHover: '#282c34',
    controlsBgAccentHover: '#a972ff',
    controlsBgAccent: '#9656fc',
    controlsBgAccentHoverSecondary: '#009d9f',
    controlsBgAccentSecondary: '#1CACAE',
    controlsBgDisable: '#7f8792',
    controlsTextDisable: '#333942',
    controlsTextPermanent: '#fcfcfc',
    strokeAccentPrimary: '#a972ff',
    strokeAccentSecondary: '#37babc',
    strokeAccentTertiary: '#5c8dea',
    strokeError: '#f76464',
    strokeGridAccentPrimary: '#a972ff',
    strokeGridError: '#f76464',
    strokeGridMain: '#2b313b',
    strokeGridTable: '#4c535d',
    strokeGrid: '#222932',
    strokeHoverFocus: '#f3f4f6',
    strokeHover: '#f3f4f6',
    strokePrimary: '#333942',
    strokeSecondary: '#4c535d',
    strokeTertiary: '#03070d',
    strokeTertiaryInverted: '#dde1e6',
    textAccentPrimary: '#a972ff',
    textAccentSecondary: '#009d9f',
    textAccentTertiary: '#5c8dea',
    textError: '#f76464',
    textGridPrimary: '#f3f4f6',
    textInverted: '#141a23',
    textPrimary: '#f3f4f6',
    textSecondary: '#7f8792',
    textWarning: '#f4ce46',
    warningInverted: '#daae14',
  },
  [AppTheme.ThemeDarkMixed]: {
    bgAccentPrimary: 'rgba(169, 114, 255)',
    bgAccentPrimaryAlpha: 'rgba(169, 114, 255, 0.17)',
    bgAccentPrimaryAlphaRGB: '#A972FF2B',
    bgAccentPrimaryAlpha2: 'rgba(132, 62, 243, 0.35)',
    bgAccentSecondary: '#37babc',
    bgAccentSecondaryAlpha: 'rgba(0,157,159, 0.1)',
    bgAccentTertiary: '#5c8dea',
    bgAccentTertiaryAlpha: 'rgba(39,100,217, 0.1)',
    bgAccentTertiaryAlphaSolid: '#e7edf9',
    bgError: '#402027',
    bgGridAccentPrimaryAlpha: 'rgba(132, 62, 243, 0.1)',
    bgGridField: '#dde1e6',
    bgGridHeader: '#b7bdc3',
    bgGridColoredCell: '#f3f4f6',
    bgGridInverted: '#222932',
    bgGridLayerMain: '#fcfcfc',
    bgInverted: '#fcfcfc',
    bgLayer0: '#000',
    bgLayer1: '#03070D',
    bgLayer2: '#141a23',
    bgLayer3: '#222932',
    bgLayer4: '#333942',
    bgLayer5: '#4c535d',
    bgLayer4Inverted: '#dde1e6',
    bgScrollbarHover: '#282c34',
    controlsBgAccentHover: '#a972ff',
    controlsBgAccent: '#9656fc',
    controlsBgAccentHoverSecondary: '#009d9f',
    controlsBgAccentSecondary: '#1CACAE',
    controlsBgDisable: '#7f8792',
    controlsTextDisable: '#333942',
    controlsTextPermanent: '#fcfcfc',
    strokeAccentPrimary: '#a972ff',
    strokeAccentSecondary: '#009d9f',
    strokeAccentTertiary: '#5c8dea',
    strokeError: '#f76464',
    strokeGridAccentPrimary: '#843ef3',
    strokeGridError: '#ae2f2f',
    strokeGridMain: '#d4d4d4',
    strokeGridTable: '#b7bdc3',
    strokeGrid: '#222932',
    strokeHoverFocus: '#f3f4f6',
    strokeHover: '#f3f4f6',
    strokePrimary: '#333942',
    strokeSecondary: '#b7bdc3',
    strokeTertiary: '#03070d',
    strokeTertiaryInverted: '#dde1e6',
    textAccentPrimary: '#a972ff',
    textAccentSecondary: '#009d9f',
    textAccentTertiary: '#5c8dea',
    textError: '#f76464',
    textGridPrimary: '#000000',
    textInverted: '#141a23',
    textPrimary: '#f3f4f6',
    textSecondary: '#7f8792',
    textWarning: '#f4ce46',
    warningInverted: '#daae14',
  },
};

export function themeColorToKebab(str: string): string {
  return (
    str
      // Insert dash between a lowercase letter or digit and an uppercase letter
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      // Insert dash between a letter and one or more digits ("Layer10" -> "Layer-10")
      .replace(/([A-Za-z])(\d+)/g, '$1-$2')
      .toLowerCase()
  );
}

export function generateThemeCSS(theme: AppTheme): string {
  let css = `.${theme} {\n`;
  for (const [key, val] of Object.entries(themeColors[theme])) {
    css += `  --color-${themeColorToKebab(key)}: ${val};\n`;
  }
  css += '}\n';

  return css;
}

export function injectThemeStyles(theme: AppTheme) {
  const styleEl = document.createElement('style');
  styleEl.id = 'generated-theme';
  let cssString = '';

  cssString += generateThemeCSS(theme);

  styleEl.innerHTML = cssString;
  document.head.appendChild(styleEl);
}

export function getHexColor(color: string): number | string {
  if (color.startsWith('#')) {
    return parseInt(color.slice(1), 16);
  }

  if (color.startsWith('0x') || color.startsWith('0X')) {
    return parseInt(color.slice(2), 16);
  }

  return color;
}

export function convertThemeForCanvas(
  colorObj: Record<string, string>
): Record<string, number | string> {
  const convertedTheme: Record<string, number | string> = {};
  for (const [key, val] of Object.entries(colorObj)) {
    convertedTheme[key] = getHexColor(val);
  }

  return convertedTheme;
}
