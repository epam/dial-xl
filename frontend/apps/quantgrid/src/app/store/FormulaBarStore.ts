import { create } from 'zustand';

import type { FormulaBarMode } from '@frontend/common';

export type FormulaBarState = {
  formulaBarMode: FormulaBarMode;
  formulaBarExpanded: boolean;
};

export type FormulaBarActions = {
  setFormulaBarMode: (m: FormulaBarMode) => void;
  setFormulaBarExpanded: (v: boolean) => void;
};

export type FormulaBarStore = FormulaBarState & FormulaBarActions;

export const useFormulaBarStore = create<FormulaBarStore>()((set) => ({
  formulaBarMode: 'formula',
  formulaBarExpanded: false,

  setFormulaBarMode: (m) => set({ formulaBarMode: m }),
  setFormulaBarExpanded: (v) => set({ formulaBarExpanded: v }),
}));
