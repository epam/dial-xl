import { create } from 'zustand';

type State = {
  isOpen: boolean;
  sourceKey: string | null;
  datasetKey: string | null;
};

type Actions = {
  open: (sourceKey: string, datasetKey: string) => void;
  close: () => void;
};

export type ViewImportVersionsModalStore = State & Actions;

const initialState: State = {
  isOpen: false,
  sourceKey: null,
  datasetKey: null,
};

export const useViewImportVersionsModalStore =
  create<ViewImportVersionsModalStore>()((set) => ({
    ...initialState,

    open: (sourceKey: string, datasetKey: string) => {
      set({
        isOpen: true,
        sourceKey,
        datasetKey,
      });
    },

    close: () => {
      set(initialState);
    },
  }));
