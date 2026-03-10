import { create } from 'zustand';

type TriggerCtx = 'CodeEditor' | 'FormulaBar' | 'CellEditor';
type Point = { x: number; y: number };

export type FormulaMenuState = {
  formulasMenuPlacement: Point | undefined;
  formulasMenuTriggerContext: TriggerCtx | undefined;
};

export type FormulaMenuActions = {
  setFormulasMenu: (placement: Point | undefined, trigger: TriggerCtx) => void;
  hideFormulasMenu: () => void;
};

export type FormulaMenuStore = FormulaMenuState & FormulaMenuActions;

export const useFormulaMenuStore = create<FormulaMenuStore>()((set) => ({
  formulasMenuPlacement: undefined,
  formulasMenuTriggerContext: undefined,

  setFormulasMenu: (placement, trigger) =>
    set({
      formulasMenuPlacement: placement,
      formulasMenuTriggerContext: placement ? trigger : undefined,
    }),

  hideFormulasMenu: () =>
    set({
      formulasMenuPlacement: undefined,
      formulasMenuTriggerContext: undefined,
    }),
}));
