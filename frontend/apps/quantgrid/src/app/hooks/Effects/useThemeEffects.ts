import { useEffect } from 'react';

import { injectThemeStyles } from '@frontend/common';

import { useUserSettingsStore } from '../../store';

export function useThemeEffects() {
  const theme = useUserSettingsStore((s) => s.data.appTheme);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.className = theme;
    }
    injectThemeStyles(theme);
  }, [theme]);
}
