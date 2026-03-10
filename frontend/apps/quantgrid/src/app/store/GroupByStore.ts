import { create } from 'zustand';

export type GroupByTableWizardMode = 'create' | 'edit' | null;

export type GroupByState = {
  groupByTableWizardMode: GroupByTableWizardMode;
  groupByTableName: string | null;
};

export type GroupByActions = {
  changeGroupByTableWizardMode: (
    mode: GroupByTableWizardMode,
    tableName?: string,
  ) => void;
};

export type GroupByStore = GroupByState & GroupByActions;

export const useGroupByStore = create<GroupByStore>()((set) => ({
  groupByTableWizardMode: null,
  groupByTableName: null,

  changeGroupByTableWizardMode: (mode, name) =>
    set({
      groupByTableWizardMode: mode,
      groupByTableName: name ?? null,
    }),
}));
