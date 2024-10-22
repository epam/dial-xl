import * as PIXI from 'pixi.js';
import { IApplicationOptions } from 'pixi.js';

import { AppTheme } from '@frontend/common';

const chars =
  ' !"#%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~…$€абвгдеёжзийклмнопрстуфхцчшщъьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЬЭЮЯ';
export enum FontColorName {
  'lightTextPrimary' = 'lightTextPrimary',
  'lightTextSecondary' = 'lightTextSecondary',
  'darkTextPrimary' = 'darkTextPrimary',
  'darkTextSecondary' = 'darkTextSecondary',
  'lightTextError' = 'lightTextError',
  'darkTextError' = 'darkTextError',
  'lightTextAccent' = 'lightTextAccent',
  'darkTextAccent' = 'darkTextAccent',
}

export enum FontFamilies {
  'InconsolataRegular' = 'InconsolataRegular',
  'InconsolataBold' = 'InconsolataBold',
}
export const fontNameScale = 'scale=';
export const defaultFontSize = 14;

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
    FontFamilies.InconsolataRegular,
    'url(./assets/fonts/Inconsolata-Regular.ttf)',
    {
      style: 'normal',
      unicodeRange: 'U+000-5FF,U+2026',
      weight: '400',
    }
  );
  await fontRegular.load();

  const fontBold = new FontFace(
    FontFamilies.InconsolataBold,
    'url(./assets/fonts/Inconsolata-Bold.ttf)',
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
  color: number;
  themes: AppTheme[];
  fontFamilies: FontFamilies[];
}[] = [
  {
    colorName: FontColorName.lightTextPrimary,
    color: 0x141a23,
    themes: [AppTheme.ThemeLight, AppTheme.ThemeDarkMixed],
    fontFamilies: [
      FontFamilies.InconsolataRegular,
      FontFamilies.InconsolataBold,
    ],
  },
  {
    colorName: FontColorName.lightTextSecondary,
    color: 0x7f8792,
    themes: [AppTheme.ThemeLight, AppTheme.ThemeDarkMixed],
    fontFamilies: [FontFamilies.InconsolataRegular],
  },
  {
    colorName: FontColorName.darkTextPrimary,
    color: 0xf3f4f6,
    themes: [AppTheme.ThemeDark],
    fontFamilies: [
      FontFamilies.InconsolataRegular,
      FontFamilies.InconsolataBold,
    ],
  },
  {
    colorName: FontColorName.darkTextSecondary,
    color: 0x7f8792,
    themes: [AppTheme.ThemeDark],
    fontFamilies: [FontFamilies.InconsolataRegular],
  },
  {
    colorName: FontColorName.lightTextAccent,
    color: 0x2764d9,
    themes: [AppTheme.ThemeLight, AppTheme.ThemeDarkMixed],
    fontFamilies: [FontFamilies.InconsolataRegular],
  },
  {
    colorName: FontColorName.darkTextAccent,
    color: 0x5c8dea,
    themes: [AppTheme.ThemeDark],
    fontFamilies: [FontFamilies.InconsolataRegular],
  },
  {
    colorName: FontColorName.lightTextError,
    color: 0xae2f2f,
    themes: [AppTheme.ThemeLight, AppTheme.ThemeDarkMixed],
    fontFamilies: [FontFamilies.InconsolataBold],
  },
  {
    colorName: FontColorName.darkTextError,
    color: 0xf76464,
    themes: [AppTheme.ThemeDark],
    fontFamilies: [FontFamilies.InconsolataBold],
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
  antialias: true,
  resolution: globalResolution,
  eventMode: 'auto',
};
