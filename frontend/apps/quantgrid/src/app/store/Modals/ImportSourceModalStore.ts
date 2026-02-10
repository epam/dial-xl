import { create } from 'zustand';

export type ImportSourceModalConfig = {
  source?: string;
};

type State = {
  isOpen: boolean;
  source?: string;
  _resolver?: (value: boolean) => void;
};

type Actions = {
  open: (config: ImportSourceModalConfig) => Promise<boolean>;
  submit: () => void;
  cancel: () => void;
};

export type ImportSourceModalStore = State & Actions;

const initialState: State = {
  isOpen: false,
  _resolver: undefined,
};

export const useImportSourceModalStore = create<ImportSourceModalStore>()(
  (set, get) => ({
    ...initialState,

    open: (config: ImportSourceModalConfig) => {
      return new Promise<boolean>((resolve) => {
        set({
          isOpen: true,
          source: config.source,
          _resolver: resolve,
        });
      });
    },

    submit: () => {
      const { _resolver } = get();
      _resolver?.(true);
      set(initialState);
    },

    cancel: () => {
      const { _resolver } = get();
      _resolver?.(false);
      set(initialState);
    },
  })
);
