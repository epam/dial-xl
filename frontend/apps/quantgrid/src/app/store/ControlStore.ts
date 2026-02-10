import { create } from 'zustand';

export type ControlState = {
  isOpen: boolean;
};

export type ControlActions = {
  openControlCreateWizard: () => void;

  closeControlWizard: () => void;
};

export type ControlStore = ControlState & ControlActions;

export const useControlStore = create<ControlStore>()((set) => ({
  isOpen: false,

  openControlCreateWizard: () =>
    set({
      isOpen: true,
    }),

  closeControlWizard: () =>
    set({
      isOpen: false,
    }),
}));
