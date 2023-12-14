import { Modal } from 'antd';
import { useCallback, useContext, useEffect, useState } from 'react';

import { KeyboardCode } from '@frontend/common';

import { ModalRefFunction } from '../../common';
import { ProjectContext } from '../../context';
import { useApi } from '../../hooks';

type Props = {
  deleteProjectModal: { current: ModalRefFunction | null };
};

export function DeleteProject({ deleteProjectModal }: Props) {
  const { projectName } = useContext(ProjectContext);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { deleteProject } = useApi();

  const showModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleOk = useCallback(() => {
    if (projectName) {
      deleteProject(projectName);
    }
    setIsModalOpen(false);
  }, [deleteProject, projectName]);

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (!isModalOpen) return;
      if (event.key === KeyboardCode.Enter) {
        handleOk();
      }
    },
    [handleOk, isModalOpen]
  );

  useEffect(() => {
    deleteProjectModal.current = showModal;
  }, [showModal, deleteProjectModal]);

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
      }}
      open={isModalOpen}
      title="Confirm"
      onCancel={handleCancel}
      onOk={handleOk}
    >
      <span>Do you want to remove project {projectName}?</span>
    </Modal>
  );
}
