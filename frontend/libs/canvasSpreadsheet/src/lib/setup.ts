import {
  ApplicationOptions,
  Assets,
  BitmapFontManager,
  TextStyle,
} from 'pixi.js';

import { FontFamilies, getCurrencySymbols } from '@frontend/common';

const currencySymbols = getCurrencySymbols();
export const getChars = () => {
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
  try {
    const fontLight = new FontFace(
      FontFamilies.JetBrainsMonoLight,
      'url(./fonts/JetBrainsMono-Light.ttf)',
      {
        style: 'normal',
        unicodeRange: 'U+000-5FF,U+2026',
        weight: '300',
      },
    );
    await fontLight.load();

    const fontSemiBold = new FontFace(
      FontFamilies.JetBrainsMonoSemiBold,
      'url(./fonts/JetBrainsMono-SemiBold.ttf)',
      {
        style: 'normal',
        unicodeRange: 'U+000-5FF,U+2026',
        weight: '600',
      },
    );
    await fontSemiBold.load();

    const fonts = Object.keys(FontFamilies);
    for (const font of fontFaceSetIteratorToArray(document.fonts)) {
      // Firefox returns a string in quotes, Chrome does not
      const browserFontFamily = font.family.replace(/^["']|["']$/g, '');

      if (fonts.includes(browserFontFamily)) {
        document.fonts.delete(font);
      }
    }
    document.fonts.add(fontLight);
    document.fonts.add(fontSemiBold);
  } catch (error) {
    // empty block
  }
}

const resolution = Math.max(2, window.devicePixelRatio);

// Track installed bitmap fonts to avoid reinstalling
const installedBitmapFonts = new Set<string>();

// For optimization purposes:
// BitmapFont installation is a heavy operation, so generate only fonts that are:
// really used in the app, is for the current scale and theme
export function initBitmapFonts(scale: number) {
  Object.keys(FontFamilies).forEach((fontFamily) => {
    const fontKey = `${fontFamily},${fontNameScale}${scale}`;
    if (!installedBitmapFonts.has(fontKey)) {
      const style = new TextStyle({
        fontSize: Math.round(defaultFontSize * scale),
        fontFamily,
        fill: 0xffffff,
      });

      const font = BitmapFontManager.install({
        name: fontKey,
        style,
        chars,
        dynamicFill: true,
        resolution,
        textureStyle: {
          scaleMode: 'nearest',
        },
      });

      // Forcing font glyphs to have integer width on our resolution
      // to have same look for same glyphs in different positions
      const applyScale = scale === 1;
      if (applyScale) {
        const scaleModifier = 100 / (defaultFontSize * scale);
        for (const key of Object.keys(font.chars)) {
          const currentXAdvance = font.chars[key].xAdvance;

          font.chars[key].xAdvance =
            Math.floor(currentXAdvance / scaleModifier) * scaleModifier;
        }
      } else {
        for (const key of Object.keys(font.chars)) {
          font.chars[key].xAdvance = Math.round(font.chars[key].xAdvance);
        }
      }

      installedBitmapFonts.add(fontKey);
    }
  });
}

export const stageOptions: Partial<ApplicationOptions> = {
  backgroundAlpha: 0,
  antialias: true,
  autoDensity: true,
  resolution,
  powerPreference: 'high-performance',
  clearBeforeRender: true,
  autoStart: false,
  hello: false,
  sharedTicker: false,
  roundPixels: true,
};

const loadAssetsManifest = async () => {
  await Assets.init({
    basePath: 'pixi-assets',
    manifest: 'manifest.json',
  });
};

export const loadIcons = async () => {
  await loadAssetsManifest();
  await Assets.loadBundle('icons');
};
