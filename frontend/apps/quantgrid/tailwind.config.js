const { createGlobPatternsForDependencies } = require('@nx/react/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(
      __dirname,
      '{src,pages,components,app}/**/*!(*.stories|*.spec).{ts,tsx,html}'
    ),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {
      colors: {
        bgAccentPrimaryAlpha: 'var(--bg-accent-primary-alpha)',
        bgAccentPrimaryAlpha2: 'var(--bg-accent-primary-alpha-2)',
        bgAccentTertiaryAlpha: 'var(--bg-accent-tertiary-alpha)',
        bgAccentSecondary: 'var(--bg-accent-secondary)',
        bgAccentTertiary: 'var(--bg-accent-tertiary)',
        bgError: 'var(--bg-error)',
        bgGridAccentPrimaryAlpha: 'var(--bg-grid-accent-primary-alpha)',
        bgGridField: 'var(--bg-grid-field)',
        bgGridHeader: 'var(--bg-grid-header)',
        bgGridInverted: 'var(--bg-grid-inverted)',
        bgGridLayerMain: 'var(--bg-grid-layer-main)',
        bgInverted: 'var(--bg-inverted)',
        bgLayer0: 'var(--bg-layer-0)',
        bgLayer1: 'var(--bg-layer-1)',
        bgLayer2: 'var(--bg-layer-2)',
        bgLayer3: 'var(--bg-layer-3)',
        bgLayer4: 'var(--bg-layer-4)',
        bgLayer5: 'var(--bg-layer-5)',
        bgScrollbarHover: 'var(--bg-scrollbar-hover)',
        controlsBgAccent: 'var(--controls-bg-accent)',
        controlsBgAccentHover: 'var(--controls-bg-accent-hover)',
        controlsBgDisable: 'var(--controls-bg-disable)',
        controlsTextDisable: 'var(--controls-text-disable)',
        controlsTextPermanent: 'var(--controls-text-permanent)',
        strokeAccentPrimary: 'var(--stroke-accent-primary)',
        strokeAccentSecondary: 'var(--stroke-accent-secondary)',
        strokeAccentTertiary: 'var(--stroke-accent-tertiary)',
        strokeGrid: 'var(--stroke-grid)',
        strokeGridAccentPrimary: 'var(--stroke-grid-accent-primary)',
        strokeError: 'var(--stroke-error)',
        strokeGridError: 'var(--stroke-grid-error)',
        strokeGridMain: 'var(--stroke-grid-main)',
        strokeGridTable: 'var(--stroke-grid-table)',
        strokeHover: 'var(--stroke-hover)',
        strokeHoverFocus: 'var(--stroke-hover-focus)',
        strokePrimary: 'var(--stroke-primary)',
        strokeSecondary: 'var(--stroke-secondary)',
        strokeTertiary: 'var(--stroke-tertiary)',
        textAccentPrimary: 'var(--text-accent-primary)',
        textAccentSecondary: 'var(--text-accent-secondary)',
        textAccentTertiary: 'var(--text-accent-tertiary)',
        textError: 'var(--text-error)',
        textGridPrimary: 'var(--text-grid-primary)',
        textInverted: 'var(--text-inverted)',
        textPrimary: 'var(--text-primary)',
        textSecondary: 'var(--text-secondary)',
        textWarning: 'var(--text-warning)',
      },
      keyframes: {
        'fast-pulse': {
          '0%': {
            opacity: '20%',
          },
          '50%': {
            opacity: '100%',
          },
          '100%': {
            opacity: '20%',
          },
        },
      },
      animation: {
        'fast-pulse': 'fast-pulse 1.5s infinite',
      },
      typography: {
        DEFAULT: {
          css: {
            color: 'var(--text-primary)',
            a: {
              color: 'var(--bg-accent-tertiary)',
            },
            pre: {
              border: 'none',
              borderRadius: '0',
              backgroundColor: 'transparent',
            },
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
