import { create } from 'zustand';

export type CreateTableFromImportMode = 'createTable' | 'pullData';

type State = {
  isOpen: boolean;
  sourceKey: string | null;
  datasetKey: string | null;
  sourceName: string | null;
  col: number | null;
  row: number | null;
  mode: CreateTableFromImportMode;
};

type Actions = {
  open: (
    sourceKey: string,
    datasetKey: string,
    sourceName: string,
    col?: number,
    row?: number,
    mode?: CreateTableFromImportMode
  ) => void;
  close: () => void;
};

export type CreateTableFromImportModalStore = State & Actions;

const initialState: State = {
  isOpen: false,
  sourceKey: null,
  datasetKey: null,
  sourceName: null,
  col: null,
  row: null,
  mode: 'createTable',
};

export const useCreateTableFromImportModalStore =
  create<CreateTableFromImportModalStore>()((set) => ({
    ...initialState,

    open: (
      sourceKey: string,
      datasetKey: string,
      sourceName: string,
      col?: number,
      row?: number,
      mode: CreateTableFromImportMode = 'createTable'
    ) => {
      set({
        isOpen: true,
        sourceKey,
        datasetKey,
        sourceName,
        col: col ?? null,
        row: row ?? null,
        mode,
      });
    },

    close: () => {
      set(initialState);
    },
  }));
