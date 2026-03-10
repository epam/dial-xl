import { create } from 'zustand';

import { getDefaultUserSettings, UserSettings } from '../utils';

type SettingsState = {
  data: UserSettings;

  hydrated: boolean;
  hydrateError?: string | null;

  dirty: boolean;

  // actions
  setHydratedFromServer: (next: UserSettings) => void;
  patch: (partial: Partial<UserSettings>) => void;

  markSaved: () => void;
  markHydrated: (opts?: { error?: string | null }) => void;
};

export const useUserSettingsStore = create<SettingsState>((set) => ({
  data: getDefaultUserSettings(),

  hydrated: false,
  dirty: false,

  markHydrated: (opts) =>
    set({ hydrated: true, hydrateError: opts?.error ?? null }),

  setHydratedFromServer: (next) =>
    set({
      data: next,
      hydrated: true,
      dirty: false,
    }),

  patch: (partial) =>
    set((s) => ({
      data: { ...s.data, ...partial },
      dirty: true,
    })),

  markSaved: () =>
    set({
      dirty: false,
    }),
}));
