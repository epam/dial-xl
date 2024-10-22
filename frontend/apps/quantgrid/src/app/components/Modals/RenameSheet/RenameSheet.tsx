import { Input, InputRef, Modal } from 'antd';
import cx from 'classnames';
import {
  ChangeEvent,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  inputClasses,
  KeyboardCode,
  modalFooterButtonClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  secondaryButtonClasses,
  shouldStopPropagation,
} from '@frontend/common';
import { focusSpreadsheet } from '@frontend/spreadsheet';

import { RenameModalRefFunction } from '../../../common';
import { ProjectContext } from '../../../context';

type Props = {
  renameSheetModal: { current: RenameModalRefFunction | null };
};

export function RenameSheet({ renameSheetModal }: Props) {
  const { renameSheet } = useContext(ProjectContext);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [oldSheetName, setOldSheetName] = useState('');
  const [newSheetName, setNewSheetName] = useState('');
  const inputRef = useRef<InputRef | null>(null);

  const showModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleOk = useCallback(() => {
    if (oldSheetName && newSheetName) {
      renameSheet({
        oldName: oldSheetName,
        newName: newSheetName,
        silent: true,
      });
    }
    setIsModalOpen(false);
    setOldSheetName('');
    setNewSheetName('');
  }, [newSheetName, oldSheetName, renameSheet]);

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
    setOldSheetName('');
    setNewSheetName('');
  }, []);

  const onNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setNewSheetName(event.target.value);
  }, []);

  const initModal = useCallback(
    (name: string) => {
      showModal();
      setOldSheetName(name);
      setNewSheetName(name);
    },
    [showModal]
  );

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (!isModalOpen) return;
      if (shouldStopPropagation(event)) {
        event.stopPropagation();
      }
      if (
        event.key === KeyboardCode.Enter &&
        newSheetName &&
        newSheetName !== oldSheetName
      ) {
        handleOk();
      }
    },
    [isModalOpen, newSheetName, oldSheetName, handleOk]
  );

  useEffect(() => {
    renameSheetModal.current = initModal;
  }, [initModal, renameSheetModal]);

  useEffect(() => {
    setTimeout(() => {
      if (!inputRef.current || !isModalOpen) return;

      inputRef.current.focus({
        cursor: 'end',
      });
    }, 0);
  }, [isModalOpen]);

  useEffect(() => {
    window.addEventListener('keydown', onKeydown);

    return () => {
      window.removeEventListener('keydown', onKeydown);
    };
  }, [onKeydown]);

  return (
    <Modal
      afterClose={focusSpreadsheet}
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
        disabled: !newSheetName || oldSheetName === newSheetName,
      }}
      open={isModalOpen}
      title="Rename Worksheet"
      onCancel={handleCancel}
      onOk={handleOk}
    >
      <Input
        className={cx('h-12 my-3', inputClasses)}
        placeholder="Sheet name"
        ref={inputRef}
        value={newSheetName}
        autoFocus
        onChange={onNameChange}
      />
    </Modal>
  );
}
