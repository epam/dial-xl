import { InputRef, Modal } from 'antd';
import cx from 'classnames';
import { useCallback, useEffect, useRef } from 'react';

import {
  KeyboardCode,
  modalFooterButtonClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  secondaryButtonClasses,
} from '@frontend/common';

import { useDeleteModalStore } from '../../../store';

export function DeleteModal() {
  const inputRef = useRef<InputRef | null>(null);

  const isOpen = useDeleteModalStore((s) => s.isOpen);
  const contentText = useDeleteModalStore((s) => s.contentText);
  const submit = useDeleteModalStore((s) => s.submit);
  const cancel = useDeleteModalStore((s) => s.cancel);

  useEffect(() => {
    setTimeout(() => {
      if (!inputRef.current || !isOpen) return;

      inputRef.current.focus({
        cursor: 'end',
      });
      inputRef.current.select();
    }, 0);
  }, [isOpen]);

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === KeyboardCode.Enter) {
        submit();
      }
    },
    [submit, isOpen],
  );

  useEffect(() => {
    window.addEventListener('keydown', onKeydown);

    return () => {
      window.removeEventListener('keydown', onKeydown);
    };
  }, [onKeydown]);

  return (
    <Modal
      cancelButtonProps={{
        className: cx(modalFooterButtonClasses, secondaryButtonClasses),
      }}
      destroyOnHidden={true}
      okButtonProps={{
        className: cx(
          modalFooterButtonClasses,
          primaryButtonClasses,
          primaryDisabledButtonClasses,
        ),
      }}
      open={isOpen}
      title="Confirm"
      onCancel={cancel}
      onOk={submit}
    >
      <span className="text-text-primary">{contentText}</span>
    </Modal>
  );
}
