import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ChatPlacement = 'panel' | 'floating';
const defaultChatPlacement: ChatPlacement = 'panel';
const hiddenFilesStorageKey = 'show-hidden-files';
const chatPlacementStorageKey = 'chat-window-placement';

function readChatPlacement(): ChatPlacement {
  const raw = localStorage.getItem(chatPlacementStorageKey);

  return raw === 'floating' || raw === 'panel' ? raw : defaultChatPlacement;
}

export type UIState = {
  loading: boolean;
  showHiddenFiles: boolean;
  isChatOpen: boolean;
  chatWindowPlacement: ChatPlacement;
};

export type UIActions = {
  setLoading: (v: boolean) => void;
  hideLoading: (timeout?: number) => void;
  setShowHiddenFiles: (v: boolean) => void;
  toggleChat: () => void;
  toggleChatWindowPlacement: () => void;
  setChatPlacement: (p: ChatPlacement) => void;
};

export type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => {
      const initPlacement = readChatPlacement();

      return {
        loading: true,
        showHiddenFiles: ((): boolean =>
          localStorage.getItem(hiddenFilesStorageKey) === 'true')(),

        setLoading: (v) => set({ loading: v }),

        hideLoading: (timeout = 300) => {
          if (timeout <= 0) return set({ loading: false });
          setTimeout(() => set({ loading: false }), timeout);

          return;
        },

        setShowHiddenFiles: (v) => {
          set({ showHiddenFiles: v });
          localStorage.setItem(hiddenFilesStorageKey, String(v));
        },

        isChatOpen: initPlacement === 'floating',
        chatWindowPlacement: initPlacement,
        toggleChat: () => set((s) => ({ isChatOpen: !s.isChatOpen })),

        setChatPlacement: (p) => {
          const next = p === 'floating' ? 'floating' : 'panel';
          localStorage.setItem('chat-window-placement', next);

          set({
            chatWindowPlacement: next,
            isChatOpen: next === 'floating',
          });
        },

        toggleChatWindowPlacement: () => {
          const { chatWindowPlacement, setChatPlacement } = get();
          const next = chatWindowPlacement === 'panel' ? 'floating' : 'panel';
          setChatPlacement(next);
        },
      };
    },
    {
      name: 'ui',
      partialize: (s) => ({
        showHiddenFiles: s.showHiddenFiles,
        chatWindowPlacement: s.chatWindowPlacement,
      }),
    }
  )
);
