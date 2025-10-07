import { Form, Input, InputRef, Modal } from 'antd';
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

import { NewProjectModalRefFunction } from '../../../common';
import { ProjectContext } from '../../../context';
import { isEntityNameInvalid } from '../../../utils';
import { SelectResourceInput } from '../../SelectResourceInput';

const inputFieldKey = 'projectName';

type Props = {
  newProjectModal: { current: NewProjectModalRefFunction | null };
};

export function NewProject({ newProjectModal }: Props) {
  const [form] = Form.useForm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectPath, setProjectPath] = useState<string | null | undefined>(
    undefined
  );
  const [existingProjectNames, setExistingProjectNames] = useState<
    string[] | undefined
  >(undefined);
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
      existingProjectNames?: string[];
      onSuccess?: () => void;
      openInNewTab?: boolean;
    }) => {
      setIsModalOpen(true);
      setProjectPath(args.projectPath);
      setExistingProjectNames(args.existingProjectNames);
      setProjectBucket(args.projectBucket);
      openInNewTabRef.current = args.openInNewTab;
      onSuccessRef.current = args.onSuccess;
    },
    []
  );

  const handleOk = useCallback(async () => {
    try {
      await form.validateFields({ recursive: true });
    } catch {
      return;
    }

    const projectName = form.getFieldValue(inputFieldKey);

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
    form.resetFields();
    setProjectPath(undefined);
    setExistingProjectNames(undefined);
  }, [form, createProject, projectPath, projectBucket]);

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
    form.resetFields();
    setProjectPath(undefined);
    setExistingProjectNames(undefined);
  }, [form]);

  const onProjectNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const prevValue = form.getFieldValue(inputFieldKey) ?? '';
      if (isEntityNameInvalid(event.target.value)) {
        event.preventDefault();

        return prevValue;
      }

      return event.target.value;
    },
    [form]
  );

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (!isModalOpen) return;
      if (shouldStopPropagation(event)) {
        event.stopPropagation();
      }
      if (event.key === KeyboardCode.Enter) {
        handleOk();
      }
    },
    [handleOk, isModalOpen]
  );

  const handleSelectFolder = useCallback(
    (bucket: string, parentPath: string | null | undefined) => {
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
      inputRef.current.select();
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
      destroyOnHidden={true}
      okButtonProps={{
        className: cx(
          modalFooterButtonClasses,
          primaryButtonClasses,
          primaryDisabledButtonClasses
        ),
      }}
      open={isModalOpen}
      title="New Project"
      onCancel={handleCancel}
      onOk={handleOk}
    >
      <div className="flex flex-col gap-3">
        {projectBucket && (
          <SelectResourceInput
            bucket={projectBucket}
            inputLabel="Create in"
            path={projectPath}
            onSelect={handleSelectFolder}
          />
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-secondary" htmlFor="projectName">
            Project Name
          </label>

          <Form className="pb-2" form={form}>
            <Form.Item
              getValueFromEvent={onProjectNameChange}
              name="projectName"
              rules={[
                { required: true, message: 'Project name is required' },
                {
                  validator: (_, value) => {
                    const result = !existingProjectNames?.includes(value);

                    return result
                      ? Promise.resolve()
                      : Promise.reject(
                          new Error('Project with this name already exists')
                        );
                  },
                },
              ]}
              validateTrigger={['onBlur']}
            >
              <Input
                className={cx(inputClasses, 'h-10 px-2')}
                id="projectName"
                ref={inputRef}
              />
            </Form.Item>
          </Form>
        </div>
      </div>
    </Modal>
  );
}
