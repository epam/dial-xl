import { ReactNode } from 'react';
import { create } from 'zustand';

import { ImportArgs } from '../../hooks';

type SyncImportsConfirmModalConfig = {
  title: string;
  primaryMessage: ReactNode;
  listItems: ImportArgs[];
  okText?: string;
  onConfirm: () => void | Promise<void>;
};

type State = {
  isOpen: boolean;
  title: string;
  okText: string;
  primaryMessage: ReactNode;
  listItems: ImportArgs[];
  onConfirm?: () => void | Promise<void>;
};

type Actions = {
  open: (config: SyncImportsConfirmModalConfig) => void;
  submit: () => Promise<void>;
  close: () => void;
};

export type SyncImportsConfirmModalStore = State & Actions;

const initialState: State = {
  isOpen: false,
  title: '',
  okText: 'OK',
  primaryMessage: null,
  listItems: [],
  onConfirm: undefined,
};

export const useSyncImportsConfirmModalStore =
  create<SyncImportsConfirmModalStore>()((set, get) => ({
    ...initialState,

    open: ({
      title,
      okText = 'Sync',
      primaryMessage,
      listItems,
      onConfirm,
    }) => {
      set({
        isOpen: true,
        title,
        okText,
        primaryMessage,
        listItems,
        onConfirm,
      });
    },

    submit: async () => {
      const { onConfirm } = get();
      await onConfirm?.();
      set(initialState);
    },

    close: () => {
      set(initialState);
    },
  }));
