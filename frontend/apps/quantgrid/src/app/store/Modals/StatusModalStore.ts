import { create } from 'zustand';

type State = {
  isOpen: boolean;
  text: string;
};

type Actions = {
  open: (text: string) => void;
  close: () => void;
};

export type StatusModalStore = State & Actions;

const initial: State = { isOpen: false, text: '' };

export const useStatusModalStore = create<StatusModalStore>()((set) => ({
  ...initial,

  open: (text) => {
    const next: Partial<State> = { isOpen: true, text };

    set(next as State);
  },

  close: () => {
    set(initial);
  },
}));
