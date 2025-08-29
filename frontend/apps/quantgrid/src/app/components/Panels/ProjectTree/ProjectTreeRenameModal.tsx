import { Input, InputRef, Modal } from 'antd';
import cx from 'classnames';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

import {
  inputClasses,
  KeyboardCode,
  modalFooterButtonClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  secondaryButtonClasses,
  shouldStopPropagation,
} from '@frontend/common';

type Props = {
  modalTitle: string;
  oldName: string;
  isOpened: boolean;
  onRename: (newName: string) => void;
  onCancel: () => void;
};

export function ProjectTreeRenameModal({
  isOpened,
  modalTitle,
  oldName,
  onRename,
  onCancel,
}: Props) {
  const [newName, setNewTableName] = useState('');
  const inputRef = useRef<InputRef | null>(null);

  const handleOk = useCallback(() => {
    setNewTableName('');
    if (oldName && newName) {
      onRename(newName);
    }
  }, [newName, oldName, onRename]);

  const handleCancel = useCallback(() => {
    setNewTableName('');
    onCancel();
  }, [onCancel]);

  const onNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setNewTableName(event.target.value);
  }, []);

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpened) return;
      if (shouldStopPropagation(event)) {
        event.stopPropagation();
      }
      if (event.key === KeyboardCode.Enter && newName && newName !== oldName) {
        handleOk();
      }
    },
    [isOpened, newName, oldName, handleOk]
  );

  useEffect(() => {
    setNewTableName(oldName);
  }, [oldName]);

  useEffect(() => {
    setTimeout(() => {
      if (!inputRef.current || !isOpened) return;

      inputRef.current.focus({
        cursor: 'end',
      });
    }, 0);
  }, [isOpened]);

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
      destroyOnClose={true}
      okButtonProps={{
        className: cx(
          modalFooterButtonClasses,
          primaryButtonClasses,
          primaryDisabledButtonClasses
        ),
        disabled: !newName || oldName === newName,
      }}
      open={isOpened}
      title={modalTitle}
      onCancel={handleCancel}
      onOk={handleOk}
    >
      <Input
        className={cx('h-12 my-3', inputClasses)}
        placeholder="New name"
        ref={inputRef}
        value={newName}
        autoFocus
        onChange={onNameChange}
      />
    </Modal>
  );
}
