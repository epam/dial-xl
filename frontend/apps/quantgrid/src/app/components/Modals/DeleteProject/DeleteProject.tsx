import { Modal } from 'antd';
import cx from 'classnames';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import {
  KeyboardCode,
  modalFooterButtonClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  secondaryButtonClasses,
} from '@frontend/common';

import { DeleteProjectModalRefFunction } from '../../../common';
import { ProjectContext } from '../../../context';

type Props = {
  deleteProjectModal: { current: DeleteProjectModalRefFunction | null };
};

export function DeleteProject({ deleteProjectModal }: Props) {
  const { deleteProject } = useContext(ProjectContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [projectBucket, setProjectBucket] = useState<string | null>(null);
  const [projectPath, setProjectPath] = useState<string | null | undefined>(
    null
  );
  const onSuccessRef = useRef<() => void>();

  const showModal = useCallback(
    (args: {
      name: string;
      projectBucket: string;
      projectPath: string | null | undefined;
      onSuccess?: () => void;
    }) => {
      setIsModalOpen(true);
      setProjectName(args.name);
      setProjectBucket(args.projectBucket);
      setProjectPath(args.projectPath);
      onSuccessRef.current = args.onSuccess;
    },
    []
  );

  const handleOk = useCallback(() => {
    if (projectName && projectBucket) {
      deleteProject({
        projectName,
        bucket: projectBucket,
        path: projectPath,
        silent: true,
        onSuccess: onSuccessRef.current,
      });
    }
    setIsModalOpen(false);
  }, [deleteProject, projectBucket, projectName, projectPath]);

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
      }}
      open={isModalOpen}
      title="Confirm"
      onCancel={handleCancel}
      onOk={handleOk}
    >
      <span className="text-textPrimary">
        Do you want to remove project "{projectName}"?
      </span>
    </Modal>
  );
}
