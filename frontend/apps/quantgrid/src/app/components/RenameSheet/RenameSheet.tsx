import { Input, InputRef, Modal } from 'antd';
import {
  ChangeEvent,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { KeyboardCode } from '@frontend/common';

import { RenameModalRefFunction } from '../../common';
import { ProjectContext } from '../../context';
import { useApi } from '../../hooks';

type Props = {
  renameSheetModal: { current: RenameModalRefFunction | null };
};

export function RenameSheet({ renameSheetModal }: Props) {
  const { projectName } = useContext(ProjectContext);
  const { renameWorksheet } = useApi();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [oldSheetName, setOldSheetName] = useState('');
  const [newSheetName, setNewSheetName] = useState('');
  const inputRef = useRef<InputRef | null>(null);

  const showModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleOk = useCallback(() => {
    if (projectName && oldSheetName && newSheetName) {
      renameWorksheet(projectName, oldSheetName, newSheetName);
    }
    setIsModalOpen(false);
    setOldSheetName('');
    setNewSheetName('');
  }, [newSheetName, oldSheetName, projectName, renameWorksheet]);

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
      okButtonProps={{
        className: 'bg-blue-500 enabled:hover:bg-blue-700',
        disabled: !newSheetName || oldSheetName === newSheetName,
      }}
      open={isModalOpen}
      title="Rename Worksheet"
      onCancel={handleCancel}
      onOk={handleOk}
    >
      <Input
        placeholder="sheet name"
        ref={inputRef}
        value={newSheetName}
        autoFocus
        onChange={onNameChange}
      />
    </Modal>
  );
}
