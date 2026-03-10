import { Modal } from 'antd';
import cx from 'classnames';
import { useEffect } from 'react';

import {
  modalFooterButtonClasses,
  primaryButtonClasses,
} from '@frontend/common';
import { KeyboardCode } from '@frontend/common';

import { useStatusModalStore } from '../../../store';

export function StatusModal() {
  const isOpen = useStatusModalStore((s) => s.isOpen);
  const text = useStatusModalStore((s) => s.text);
  const close = useStatusModalStore((s) => s.close);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === KeyboardCode?.Enter ||
        e.key === 'Enter' ||
        e.key === ' ' ||
        e.code === 'Space'
      ) {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  return (
    <Modal
      cancelButtonProps={{ style: { display: 'none' } }}
      destroyOnHidden={true}
      okButtonProps={{
        className: cx(modalFooterButtonClasses, primaryButtonClasses),
      }}
      open={isOpen}
      title={text}
      onCancel={close}
      onOk={close}
    />
  );
}
