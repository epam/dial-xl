import { create } from 'zustand';

type State = {
  isOpen: boolean;
};

type Actions = {
  open: () => void;
  close: () => void;
};

export type ShortcutsHelpModalStore = State & Actions;

const initial: State = { isOpen: false };

export const useShortcutsHelpModalStore = create<ShortcutsHelpModalStore>()(
  (set) => ({
    ...initial,

    open: () => {
      const next: Partial<State> = { isOpen: true };

      set(next as State);
    },

    close: () => {
      set(initial);
    },
  }),
);
