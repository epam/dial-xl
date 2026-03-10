import { create } from 'zustand';

export type PivotTableWizardMode = 'create' | 'edit' | null;

export type PivotState = {
  pivotTableWizardMode: PivotTableWizardMode;
  pivotTableName: string | null;
};

export type PivotActions = {
  changePivotTableWizardMode: (
    mode: PivotTableWizardMode,
    tableName?: string,
  ) => void;
};

export type PivotStore = PivotState & PivotActions;

export const usePivotStore = create<PivotStore>()((set) => ({
  pivotTableWizardMode: null,
  pivotTableName: null,

  changePivotTableWizardMode: (mode, name) =>
    set({
      pivotTableWizardMode: mode,
      pivotTableName: name ?? null,
    }),
}));
