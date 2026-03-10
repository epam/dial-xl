import { create } from 'zustand';

export type QuestionPreviewModalConfig = {
  question_file?: string;
};

type State = {
  isOpen: boolean;
  question_file?: string;
  _resolver?: (value: boolean) => void;
};

type Actions = {
  open: (config: QuestionPreviewModalConfig) => Promise<boolean>;
  cancel: () => void;
};

export type QuestionPreviewModalStore = State & Actions;

const initialState: State = {
  isOpen: false,
  _resolver: undefined,
};

export const useQuestionPreviewModalStore = create<QuestionPreviewModalStore>()(
  (set, get) => ({
    ...initialState,

    open: (config: QuestionPreviewModalConfig) => {
      return new Promise<boolean>((resolve) => {
        set({
          isOpen: true,
          question_file: config.question_file,
          _resolver: resolve,
        });
      });
    },

    cancel: () => {
      const { _resolver } = get();
      _resolver?.(false);
      set(initialState);
    },
  }),
);
