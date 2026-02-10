import { create } from 'zustand';

export type DeleteModalConfig = {
  contentText: string;
};

type State = {
  isOpen: boolean;
  contentText: string;
  _resolver?: (value: boolean) => void;
};

type Actions = {
  open: (config: DeleteModalConfig) => Promise<boolean>;
  submit: () => void;
  cancel: () => void;
};

export type DeleteModalStore = State & Actions;

const initialState: State = {
  isOpen: false,
  contentText: '',
  _resolver: undefined,
};

export const useDeleteModalStore = create<DeleteModalStore>()((set, get) => ({
  ...initialState,

  open: (config) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        contentText: config.contentText ?? '',
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
}));
