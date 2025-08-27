import * as PIXI from 'pixi.js';
import { IApplicationOptions } from 'pixi.js';

import {
  AppTheme,
  getCurrencySymbols,
  getHexColor,
  themeColors,
} from '@frontend/common';

import { Color } from './types';

const currencySymbols = getCurrencySymbols();
const getChars = () => {
  const defaultChars = ` →!"#%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~…абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ`;
  const currencySymbolsChars = currencySymbols.join('');

  return `${defaultChars}${currencySymbolsChars}`
    .split('')
    .reduce((acc, curr) => {
      if (!acc.includes(curr)) {
        acc.push(curr);
      }

      return acc;
    }, [] as string[])
    .join('');
};

const chars = getChars();

export enum FontColorName {
  'lightTextPrimary' = 'lightTextPrimary',
  'lightTextSecondary' = 'lightTextSecondary',
  'darkTextPrimary' = 'darkTextPrimary',
  'darkTextSecondary' = 'darkTextSecondary',
  'lightTextError' = 'lightTextError',
  'darkTextError' = 'darkTextError',
  'lightTextAccent' = 'lightTextAccent',
  'darkTextAccent' = 'darkTextAccent',
  'lightTextAccentSecondary' = 'lightTextAccentSecondary',
  'darkTextAccentSecondary' = 'darkTextAccentSecondary',
}

export enum FontFamilies {
  'JetBrainsMonoRegular' = 'JetBrainsMonoRegular',
  'JetBrainsMonoBold' = 'JetBrainsMonoBold',
}
export const fontNameScale = 'scale=';
export const defaultFontSize = 12;

// Firefox issue, documents.fonts.values() returns error
function fontFaceSetIteratorToArray(fonts: FontFaceSet): FontFace[] {
  const results = [];
  const iterable = fonts.values();

  while (true) {
    const f = iterable.next();
    if (f.done) {
      break;
    }

    results.push(f.value);
  }

  return results;
}

export async function loadFonts() {
  const fontRegular = new FontFace(
    FontFamilies.JetBrainsMonoRegular,
    'url(./assets/fonts/JetBrainsMono-Regular.ttf)',
    {
      style: 'normal',
      unicodeRange: 'U+000-5FF,U+2026',
      weight: '400',
    }
  );
  await fontRegular.load();

  const fontBold = new FontFace(
    FontFamilies.JetBrainsMonoBold,
    'url(./assets/fonts/JetBrainsMono-Bold.ttf)',
    {
      style: 'normal',
      unicodeRange: 'U+000-5FF,U+2026',
      weight: '700',
    }
  );
  await fontBold.load();

  const fonts = Object.keys(FontFamilies);
  for (const font of fontFaceSetIteratorToArray(document.fonts)) {
    // Firefox returns a string in quotes, Chrome does not
    const browserFontFamily = font.family.replace(/^["']|["']$/g, '');

    if (fonts.includes(browserFontFamily)) {
      document.fonts.delete(font);
    }
  }
  document.fonts.add(fontRegular);
  document.fonts.add(fontBold);
}

const fontColors: {
  colorName: FontColorName;
  color: Color;
  themes: AppTheme[];
  fontFamilies: FontFamilies[];
}[] = [
  {
    colorName: FontColorName.lightTextPrimary,
    color: getHexColor(themeColors[AppTheme.ThemeLight].textGridPrimary),
    themes: [AppTheme.ThemeLight, AppTheme.ThemeDarkMixed],
    fontFamilies: [
      FontFamilies.JetBrainsMonoRegular,
      FontFamilies.JetBrainsMonoBold,
    ],
  },
  {
    colorName: FontColorName.lightTextSecondary,
    color: getHexColor(themeColors[AppTheme.ThemeLight].textSecondary),
    themes: [AppTheme.ThemeLight, AppTheme.ThemeDarkMixed],
    fontFamilies: [FontFamilies.JetBrainsMonoRegular],
  },
  {
    colorName: FontColorName.darkTextPrimary,
    color: getHexColor(themeColors[AppTheme.ThemeDark].textGridPrimary),
    themes: [AppTheme.ThemeDark],
    fontFamilies: [
      FontFamilies.JetBrainsMonoRegular,
      FontFamilies.JetBrainsMonoBold,
    ],
  },
  {
    colorName: FontColorName.darkTextSecondary,
    color: getHexColor(themeColors[AppTheme.ThemeDark].textSecondary),
    themes: [AppTheme.ThemeDark],
    fontFamilies: [FontFamilies.JetBrainsMonoRegular],
  },
  {
    colorName: FontColorName.lightTextAccent,
    color: getHexColor(themeColors[AppTheme.ThemeLight].textAccentTertiary),
    themes: [AppTheme.ThemeLight, AppTheme.ThemeDarkMixed],
    fontFamilies: [FontFamilies.JetBrainsMonoRegular],
  },
  {
    colorName: FontColorName.darkTextAccent,
    color: getHexColor(themeColors[AppTheme.ThemeDark].textAccentTertiary),
    themes: [AppTheme.ThemeDark],
    fontFamilies: [FontFamilies.JetBrainsMonoRegular],
  },
  {
    colorName: FontColorName.lightTextError,
    color: getHexColor(themeColors[AppTheme.ThemeLight].textError),
    themes: [AppTheme.ThemeLight, AppTheme.ThemeDarkMixed],
    fontFamilies: [FontFamilies.JetBrainsMonoBold],
  },
  {
    colorName: FontColorName.darkTextError,
    color: getHexColor(themeColors[AppTheme.ThemeDark].textError),
    themes: [AppTheme.ThemeDark],
    fontFamilies: [FontFamilies.JetBrainsMonoBold],
  },
  {
    colorName: FontColorName.lightTextAccentSecondary,
    color: getHexColor(themeColors[AppTheme.ThemeLight].textAccentSecondary),
    themes: [AppTheme.ThemeLight, AppTheme.ThemeDarkMixed],
    fontFamilies: [
      FontFamilies.JetBrainsMonoBold,
      FontFamilies.JetBrainsMonoRegular,
    ],
  },
  {
    colorName: FontColorName.darkTextAccentSecondary,
    color: getHexColor(themeColors[AppTheme.ThemeDark].textAccentSecondary),
    themes: [AppTheme.ThemeDark],
    fontFamilies: [
      FontFamilies.JetBrainsMonoBold,
      FontFamilies.JetBrainsMonoRegular,
    ],
  },
];

// For optimization purposes:
// BitmapFont.from() is a heavy operation, so generate only fonts that are:
// really used in the app, is for the current scale and theme
export function initBitmapFonts(scale: number, themeName: AppTheme) {
  Object.keys(FontFamilies).forEach((fontFamily) => {
    fontColors.forEach(({ colorName, color }) => {
      const shouldGenerateFont = fontColors.some(
        (f) =>
          f.colorName === colorName &&
          f.themes.includes(themeName) &&
          f.fontFamilies.includes(fontFamily as FontFamilies)
      );

      if (shouldGenerateFont) {
        const fontKey = `${fontFamily},${colorName},${fontNameScale}${scale}`;
        if (!PIXI.BitmapFont.available[fontKey]) {
          PIXI.BitmapFont.from(
            fontKey,
            {
              fontSize: Math.round(defaultFontSize * scale),
              fill: color,
              fontFamily,
            },
            { resolution: globalResolution, chars }
          );
        }
      }
    });
  });
}

export const globalResolution = Math.max(2, window.devicePixelRatio);

export function setupPixi() {
  if (PIXI.settings.RENDER_OPTIONS) {
    PIXI.settings.RENDER_OPTIONS.hello = false;
  }
  PIXI.settings.ROUND_PIXELS = true;
  PIXI.settings.RESOLUTION = globalResolution;
}

export const stageOptions: Partial<IApplicationOptions> = {
  backgroundAlpha: 0,
  antialias: true,
  resolution: globalResolution,
  powerPreference: 'high-performance',
  clearBeforeRender: true,
};
