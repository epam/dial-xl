import { create } from 'zustand';

import { CommonMetadata } from '@frontend/common';

type ExcelPreviewState = {
  isOpen: boolean;
  file: CommonMetadata | null;
  col: number | null;
  row: number | null;
  createInNewSheet: boolean;
};

type ExcelPreviewActions = {
  open: (
    file: CommonMetadata,
    createInNewSheet: boolean,
    col?: number,
    row?: number,
  ) => void;
  close: () => void;
};

export type ExcelPreviewStore = ExcelPreviewState & ExcelPreviewActions;

const initialState: ExcelPreviewState = {
  isOpen: false,
  file: null,
  col: null,
  row: null,
  createInNewSheet: false,
};

export const useExcelPreviewStore = create<ExcelPreviewStore>()((set) => ({
  ...initialState,

  open: (
    file: CommonMetadata,
    createInNewSheet: boolean,
    col?: number,
    row?: number,
  ) =>
    set((s) => ({
      ...s,
      isOpen: true,
      file,
      createInNewSheet,
      col: col ?? null,
      row: row ?? null,
    })),

  close: () => {
    set(initialState);
  },
}));
