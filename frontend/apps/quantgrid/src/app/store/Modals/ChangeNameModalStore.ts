import { create } from 'zustand';

export type ChangeNameKind =
  | 'renameProject'
  | 'renameSheet'
  | 'renameConversation'
  | 'cloneProject'
  | 'createSheet'
  | 'createFolder';

export type ModalUIProps = {
  title: string;
  label: string;
  placeholder: string;
  okText: string;
  inputId: string;
  enableSameNameCheck: boolean;
};

export type ChangeNameUIOverrides = Partial<
  Pick<
    ModalUIProps,
    | 'title'
    | 'label'
    | 'placeholder'
    | 'okText'
    | 'inputId'
    | 'enableSameNameCheck'
  >
>;

export type ChangeNameModalConfig = {
  kind: ChangeNameKind;
  initialName: string;
  uiOverrides?: ChangeNameUIOverrides;
  validate?: (name: string) => string | undefined;
};

type State = {
  isOpen: boolean;
  name: string;
  error?: string;
  config?: ChangeNameModalConfig;
  _resolver?: (value: string | null) => void;
};

type Actions = {
  open: (config: ChangeNameModalConfig) => Promise<string | null>;
  setName: (name: string) => void;
  submit: () => void;
  cancel: () => void;
};

export type ChangeNameModalStore = State & Actions;

const initialState: State = {
  isOpen: false,
  name: '',
  error: undefined,
  config: undefined,
  _resolver: undefined,
};

export const useChangeNameModalStore = create<ChangeNameModalStore>()(
  (set, get) => ({
    ...initialState,

    open: (config) => {
      return new Promise<string | null>((resolve) => {
        const error = config?.validate
          ? config.validate(config.initialName ?? '')
          : undefined;

        set({
          isOpen: true,
          name: config.initialName ?? '',
          error,
          config,
          _resolver: resolve,
        });
      });
    },

    setName: (name) => {
      const { config } = get();
      const error = config?.validate ? config.validate(name) : undefined;
      set({ name, error });
    },

    submit: () => {
      const { name, error, _resolver } = get();
      if (error) return;
      _resolver?.(name);
      set(initialState);
    },

    cancel: () => {
      const { _resolver } = get();
      _resolver?.(null);
      set(initialState);
    },
  }),
);
