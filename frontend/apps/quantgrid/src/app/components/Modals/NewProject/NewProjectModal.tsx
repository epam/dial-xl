import { Form, Input, InputRef, Modal } from 'antd';
import cx from 'classnames';
import { ChangeEvent, useCallback, useEffect, useRef } from 'react';

import {
  inputClasses,
  KeyboardCode,
  modalFooterButtonClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  secondaryButtonClasses,
  shouldStopPropagation,
} from '@frontend/common';

import { useNewProjectModalStore } from '../../../store';
import { isEntityNameInvalid } from '../../../utils';
import { SelectResourceInput } from '../../SelectResourceInput';

const inputFieldKey = 'projectName';

export function NewProjectModal() {
  const [form] = Form.useForm();
  const inputRef = useRef<InputRef | null>(null);

  const isOpen = useNewProjectModalStore((s) => s.isOpen);
  const close = useNewProjectModalStore((s) => s.close);
  const submit = useNewProjectModalStore((s) => s.submit);
  const existingProjectNames = useNewProjectModalStore(
    (s) => s.existingProjectNames
  );
  const projectPath = useNewProjectModalStore((s) => s.path);
  const projectBucket = useNewProjectModalStore((s) => s.bucket);
  const setProjectPath = useNewProjectModalStore((s) => s.setPath);
  const setProjectBucket = useNewProjectModalStore((s) => s.setBucket);

  const handleOk = useCallback(async () => {
    try {
      await form.validateFields({ recursive: true });
    } catch {
      return;
    }

    const projectName = form.getFieldValue(inputFieldKey);

    if (projectName) {
      submit(projectName);
    }
    form.resetFields();
  }, [form, submit]);

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
      if (!isOpen) return;
      if (shouldStopPropagation(event)) {
        event.stopPropagation();
      }
      if (event.key === KeyboardCode.Enter) {
        handleOk();
      }
    },
    [handleOk, isOpen]
  );

  const handleSelectFolder = useCallback(
    (bucket: string, parentPath: string | null | undefined) => {
      setProjectPath(parentPath);
      setProjectBucket(bucket);
    },
    [setProjectBucket, setProjectPath]
  );

  useEffect(() => {
    setTimeout(() => {
      if (!inputRef.current || !isOpen) return;

      inputRef.current.focus({
        cursor: 'start',
      });
      inputRef.current.select();
    }, 0);
  }, [isOpen]);

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
      open={isOpen}
      title="New Project"
      onCancel={close}
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
