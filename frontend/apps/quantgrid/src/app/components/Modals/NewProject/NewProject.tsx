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

import { NewProjectModalRefFunction } from '../../../common';
import { ProjectContext } from '../../../context';
import { isEntityNameInvalid } from '../../../utils';
import { SelectFolderInput } from '../../SelectFolderInput';

type Props = {
  newProjectModal: { current: NewProjectModalRefFunction | null };
};

export function NewProject({ newProjectModal }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectPath, setProjectPath] = useState<string | null | undefined>(
    undefined
  );
  const [projectBucket, setProjectBucket] = useState<string | null | undefined>(
    undefined
  );
  const inputRef = useRef<InputRef | null>(null);

  const { createProject } = useContext(ProjectContext);
  const onSuccessRef = useRef<(() => void) | null>();
  const openInNewTabRef = useRef<boolean>();

  const showModal = useCallback(
    (args: {
      projectPath?: string | null;
      projectBucket: string;
      onSuccess?: () => void;
      openInNewTab?: boolean;
    }) => {
      setIsModalOpen(true);
      setProjectPath(args.projectPath);
      setProjectBucket(args.projectBucket);
      openInNewTabRef.current = args.openInNewTab;
      onSuccessRef.current = args.onSuccess;
    },
    []
  );

  const handleOk = useCallback(() => {
    if (projectName) {
      createProject({
        newName: projectName,
        silent: true,
        path: projectPath,
        bucket: projectBucket,
        onSuccess: onSuccessRef.current || undefined,
        openInNewTab: openInNewTabRef.current,
      });
    }
    setIsModalOpen(false);
    setProjectName('');
    setProjectPath(undefined);
  }, [projectName, createProject, projectPath, projectBucket]);

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
    setProjectName('');
  }, []);

  const onProjectNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (isEntityNameInvalid(event.target.value)) return;

      setProjectName(event.target.value);
    },
    []
  );

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (!isModalOpen) return;
      if (shouldStopPropagation(event)) {
        event.stopPropagation();
      }
      if (event.key === KeyboardCode.Enter && projectName) {
        handleOk();
      }
    },
    [handleOk, isModalOpen, projectName]
  );

  const handleSelectFolder = useCallback(
    (parentPath: string | null | undefined, bucket: string) => {
      setProjectPath(parentPath);
      setProjectBucket(bucket);
    },
    []
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
        disabled: !projectName,
      }}
      open={isModalOpen}
      title="New Project"
      onCancel={handleCancel}
      onOk={handleOk}
    >
      <div className="flex flex-col gap-3">
        {projectBucket && (
          <SelectFolderInput
            bucket={projectBucket}
            inputLabel="Create in"
            path={projectPath}
            onSelectFolder={handleSelectFolder}
          />
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs text-textSecondary" htmlFor="projectName">
            Project Name
          </label>
          <Input
            className={cx(inputClasses, 'h-10 px-2')}
            id="projectName"
            ref={inputRef}
            value={projectName}
            autoFocus
            onChange={onProjectNameChange}
          />
        </div>
      </div>
    </Modal>
  );
}
