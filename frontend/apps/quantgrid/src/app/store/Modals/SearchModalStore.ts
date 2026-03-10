import { create } from 'zustand';

import { ISearchFilter } from '../../components';

type SearchModalState = {
  isOpen: boolean;
  filter: ISearchFilter | null;
  searchQuery: string;
};

type SearchModalActions = {
  open: (opts?: { presetFilter?: ISearchFilter; query?: string }) => void;
  close: () => void;
  setFilter: (f: ISearchFilter | null) => void;
  setQuery: (q: string) => void;
};

export type SearchModalStore = SearchModalState & SearchModalActions;

const initialState: SearchModalState = {
  isOpen: false,
  filter: null,
  searchQuery: '',
};

export const useSearchModalStore = create<SearchModalStore>()((set) => ({
  ...initialState,

  open: (opts) =>
    set((s) => ({
      isOpen: true,
      filter: opts?.presetFilter ?? s.filter,
      searchQuery: opts?.query ?? s.searchQuery,
    })),

  close: () => set((s) => ({ ...s, isOpen: false })),

  setFilter: (f) => set({ filter: f }),
  setQuery: (q) => set({ searchQuery: q }),
}));
