import { create } from 'zustand';

import { ResourceReference } from '../../common';

type State = {
  isOpen: boolean;
  resources: ResourceReference[];
};

type Actions = {
  open: (resources: ResourceReference[]) => void;
  close: () => void;
};

export type ShareFilesModalStore = State & Actions;

const initial: State = { isOpen: false, resources: [] };

export const useShareFilesModalStore = create<ShareFilesModalStore>()(
  (set) => ({
    ...initial,

    open: (resources) => {
      const next: Partial<State> = { isOpen: true, resources };

      set(next as State);
    },

    close: () => {
      set(initial);
    },
  }),
);
