import { Input, InputRef, Modal } from 'antd';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

import { KeyboardCode } from '@frontend/common';

import { RenameModalRefFunction } from '../../common';
import { useApi } from '../../hooks';

type Props = {
  renameProjectModal: { current: RenameModalRefFunction | null };
};

export function RenameProject({ renameProjectModal }: Props) {
  const { renameProject } = useApi();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [oldProjectName, setOldProjectName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const inputRef = useRef<InputRef | null>(null);

  const showModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleOk = useCallback(() => {
    if (oldProjectName && newProjectName) {
      renameProject(oldProjectName, newProjectName);
    }
    setIsModalOpen(false);
    setNewProjectName('');
    setOldProjectName('');
  }, [newProjectName, oldProjectName, renameProject]);

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
    setOldProjectName('');
    setNewProjectName('');
  }, []);

  const onNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setNewProjectName(event.target.value);
  }, []);

  const initModal = useCallback(
    (name: string) => {
      showModal();
      setOldProjectName(name);
      setNewProjectName(name);
    },
    [showModal]
  );

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (!isModalOpen) return;
      if (
        event.key === KeyboardCode.Enter &&
        newProjectName &&
        newProjectName !== oldProjectName
      ) {
        handleOk();
      }
    },
    [handleOk, isModalOpen, newProjectName, oldProjectName]
  );

  useEffect(() => {
    renameProjectModal.current = initModal;
  }, [initModal, renameProjectModal]);

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
        disabled: !newProjectName || newProjectName === oldProjectName,
      }}
      open={isModalOpen}
      title="Rename Project"
      onCancel={handleCancel}
      onOk={handleOk}
    >
      <Input
        placeholder="project name"
        ref={inputRef}
        value={newProjectName}
        autoFocus
        onChange={onNameChange}
      />
    </Modal>
  );
}
