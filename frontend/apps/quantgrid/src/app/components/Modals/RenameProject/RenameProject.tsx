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

import { RenameModalRefFunction } from '../../../common';
import { ProjectContext } from '../../../context';
import { isEntityNameInvalid } from '../../../utils';

type Props = {
  renameProjectModal: { current: RenameModalRefFunction | null };
};

export function RenameProject({ renameProjectModal }: Props) {
  const { renameCurrentProject, projectName } = useContext(ProjectContext);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const inputRef = useRef<InputRef | null>(null);

  const showModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleOk = useCallback(() => {
    setIsModalOpen(false);

    if (newProjectName && projectName) {
      renameCurrentProject({
        newName: newProjectName,
        silent: true,
      });
    }

    setNewProjectName('');
  }, [newProjectName, projectName, renameCurrentProject]);

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
    setNewProjectName('');
  }, []);

  const onNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (isEntityNameInvalid(event.target.value)) return;

    setNewProjectName(event.target.value);
  }, []);

  const initModal = useCallback(
    (name: string) => {
      showModal();
      setNewProjectName(name);
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
        newProjectName &&
        newProjectName !== projectName
      ) {
        handleOk();
      }
    },
    [handleOk, isModalOpen, newProjectName, projectName]
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
        disabled: !newProjectName || newProjectName === projectName,
      }}
      open={isModalOpen}
      title="Rename Project"
      onCancel={handleCancel}
      onOk={handleOk}
    >
      <Input
        className={cx('h-12 my-3', inputClasses)}
        id="projectName"
        placeholder="Project name"
        ref={inputRef}
        value={newProjectName}
        autoFocus
        onChange={onNameChange}
      />
    </Modal>
  );
}
