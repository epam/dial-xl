import { Modal } from 'antd';
import { useEffect } from 'react';

import { useAntdModalStore } from '../../store';

export function AntdModalBridge(): JSX.Element {
  const [modal, contextHolder] = Modal.useModal();
  const setModal = useAntdModalStore((s) => s.setModal);

  useEffect(() => {
    setModal(modal);
  }, [modal, setModal]);

  return contextHolder;
}
