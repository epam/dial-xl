import { create } from 'zustand';

import { ChatWindowPlacement } from '../utils';
import { useUserSettingsStore } from './UserSettingsStore';

export type UIState = {
  loading: boolean;
  isChatOpen: boolean;
};

export type UIActions = {
  setLoading: (v: boolean) => void;
  hideLoading: (timeout?: number) => void;
  toggleChat: () => void;
  toggleChatWindowPlacement: () => void;
  setChatPlacement: (p: ChatWindowPlacement) => void;
};

export type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()((set, get) => ({
  loading: true,

  setLoading: (v) => set({ loading: v }),

  hideLoading: (timeout = 300) => {
    if (timeout <= 0) return set({ loading: false });
    setTimeout(() => set({ loading: false }), timeout);
  },

  isChatOpen: false,

  toggleChat: () => set((s) => ({ isChatOpen: !s.isChatOpen })),

  setChatPlacement: (p) => {
    const next: ChatWindowPlacement = p === 'floating' ? 'floating' : 'panel';

    useUserSettingsStore.getState().patch({ chatWindowPlacement: next });
    set({
      isChatOpen: next === 'floating',
    });
  },

  toggleChatWindowPlacement: () => {
    const current = useUserSettingsStore.getState().data.chatWindowPlacement as
      | ChatWindowPlacement
      | undefined;
    const next: ChatWindowPlacement =
      current === 'panel' ? 'floating' : 'panel';
    get().setChatPlacement(next);
  },
}));
