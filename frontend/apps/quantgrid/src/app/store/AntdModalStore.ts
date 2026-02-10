import { Modal, type ModalFuncProps } from 'antd';
import { create } from 'zustand';

type ModalAPI = ReturnType<typeof Modal.useModal>[0];

type AntdModalStore = {
  modalApi?: ModalAPI;
  setModal: (api: ModalAPI) => void;

  confirm: (props: ModalFuncProps) => void;
  info: (props: ModalFuncProps) => void;
  success: (props: ModalFuncProps) => void;
  warning: (props: ModalFuncProps) => void;
  error: (props: ModalFuncProps) => void;
};

export const useAntdModalStore = create<AntdModalStore>((set, get) => ({
  modalApi: undefined,

  setModal: (api) => set({ modalApi: api }),

  confirm: (props) => {
    const api = get().modalApi;
    if (api) return api.confirm(props);

    return Modal.confirm(props);
  },
  info: (props) => {
    const api = get().modalApi;
    if (api) return api.info(props);

    return Modal.info(props);
  },
  success: (props) => {
    const api = get().modalApi;
    if (api) return api.success(props);

    return Modal.success(props);
  },
  warning: (props) => {
    const api = get().modalApi;
    if (api) return api.warning(props);

    return Modal.warning(props);
  },
  error: (props) => {
    const api = get().modalApi;
    if (api) return api.error(props);

    return Modal.error(props);
  },
}));
