import { create } from 'zustand';

type ModalOptions = {
  bucket: string;
  path?: string | null;
  existingProjectNames?: string[];
};

export type NewProjectResult = {
  name: string;
  bucket: string;
  path?: string | null;
};

type State = {
  isOpen: boolean;
  bucket: string;
  path?: string | null;
  existingProjectNames?: string[];
  _resolver?: (v: NewProjectResult | null) => void;
};

type Actions = {
  open: (opts: ModalOptions) => Promise<NewProjectResult | null>;
  submit: (name: string) => void;
  close: () => void;
  setBucket: (bucket: string) => void;
  setPath: (path: string | null | undefined) => void;
};

export type NewProjectModalStore = State & Actions;

const initialState: State = {
  isOpen: false,
  bucket: '',
  path: undefined,
  existingProjectNames: undefined,
  _resolver: undefined,
};

export const useNewProjectModalStore = create<NewProjectModalStore>()(
  (set, get) => ({
    ...initialState,

    open: (opts) =>
      new Promise<NewProjectResult | null>((resolve) => {
        set({
          isOpen: true,
          bucket: opts.bucket,
          path: opts.path ?? null,
          existingProjectNames: opts.existingProjectNames,
          _resolver: resolve,
        });
      }),

    submit: (name) => {
      const { _resolver, path, bucket } = get();
      _resolver?.({ name, path, bucket });
      set(initialState);
    },

    close: () => {
      const { _resolver } = get();
      _resolver?.(null);
      set(initialState);
    },

    setBucket: (bucket) => set({ bucket }),
    setPath: (path) => set({ path }),
  })
);
