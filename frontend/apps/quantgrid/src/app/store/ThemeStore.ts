import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { AppTheme, injectThemeStyles } from '@frontend/common';

const themeStorageKey = 'app-theme';

export type ThemeState = {
  theme: AppTheme;
};

export type ThemeActions = {
  setTheme: (theme: AppTheme | string) => void;
};

export type ThemeStore = ThemeState & ThemeActions;

function isValidTheme(t: unknown): t is AppTheme {
  return (
    typeof t === 'string' && Object.values(AppTheme).includes(t as AppTheme)
  );
}

function applyThemeSideEffects(theme: AppTheme) {
  if (typeof document !== 'undefined') {
    document.documentElement.className = theme;
  }
  injectThemeStyles(theme);
}

const DEFAULT_THEME = AppTheme.ThemeLight;

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: (() => {
        const raw = localStorage.getItem(themeStorageKey);
        const t = isValidTheme(raw) ? (raw as AppTheme) : DEFAULT_THEME;
        applyThemeSideEffects(t);

        return t;
      })(),

      setTheme: (next) => {
        const t = isValidTheme(next) ? (next as AppTheme) : DEFAULT_THEME;
        set({ theme: t });
        localStorage.setItem(themeStorageKey, t);
        applyThemeSideEffects(t);
      },
    }),
    {
      name: 'theme',
      partialize: (s) => ({ theme: s.theme }),
    }
  )
);
