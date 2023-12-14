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

import { ModalRefFunction } from '../../common';
import { ProjectContext } from '../../context';
import { useApi } from '../../hooks';

type Props = {
  newProjectModal: { current: ModalRefFunction | null };
};

export function NewProject({ newProjectModal }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const inputRef = useRef<InputRef | null>(null);

  const { projectName: currentProjectName } = useContext(ProjectContext);
  const { createProject, closeProject } = useApi();

  const showModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleOk = useCallback(() => {
    if (currentProjectName) {
      closeProject(currentProjectName);
    }
    if (projectName) {
      createProject(projectName);
    }
    setIsModalOpen(false);
    setProjectName('');
  }, [currentProjectName, projectName, closeProject, createProject]);

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
    setProjectName('');
  }, []);

  const onProjectNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setProjectName(event.target.value);
    },
    []
  );

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (!isModalOpen) return;
      if (event.key === KeyboardCode.Enter && projectName) {
        handleOk();
      }
    },
    [handleOk, isModalOpen, projectName]
  );

  useEffect(() => {
    newProjectModal.current = showModal;
  }, [showModal, newProjectModal]);

  useEffect(() => {
    setTimeout(() => {
      if (!inputRef.current || !isModalOpen) return;

      inputRef.current.focus({
        cursor: 'start',
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
        disabled: !projectName,
      }}
      open={isModalOpen}
      title="New Project"
      onCancel={handleCancel}
      onOk={handleOk}
    >
      <Input
        placeholder="project name"
        ref={inputRef}
        value={projectName}
        autoFocus
        onChange={onProjectNameChange}
      />
    </Modal>
  );
}
