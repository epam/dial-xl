import { Form, Input, InputRef, Modal } from 'antd';
import cx from 'classnames';
import { useEffect, useMemo, useRef } from 'react';

import {
  inputClasses,
  modalFooterButtonClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  secondaryButtonClasses,
} from '@frontend/common';

import { useChangeNameModalStore } from '../../../store';
import { buildChangeNameUi } from './utils';

export function ChangeNameModal() {
  const [form] = Form.useForm();
  const inputRef = useRef<InputRef | null>(null);

  const isOpen = useChangeNameModalStore((s) => s.isOpen);
  const name = useChangeNameModalStore((s) => s.name);
  const error = useChangeNameModalStore((s) => s.error);
  const config = useChangeNameModalStore((s) => s.config);
  const setName = useChangeNameModalStore((s) => s.setName);
  const submit = useChangeNameModalStore((s) => s.submit);
  const cancel = useChangeNameModalStore((s) => s.cancel);

  useEffect(() => {
    setTimeout(() => {
      if (!inputRef.current || !isOpen) return;

      inputRef.current.focus({
        cursor: 'end',
      });
      inputRef.current.select();
    }, 0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    form.setFieldsValue({ newName: name });
  }, [form, name, isOpen]);

  const ui = useMemo(() => {
    if (!config) return buildChangeNameUi('renameProject');

    return buildChangeNameUi(config.kind as any, config.uiOverrides);
  }, [config]);

  const sameAsInitial = name === (config?.initialName ?? '');
  const okDisabled =
    !!error || !name || (ui.enableSameNameCheck && sameAsInitial);

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
          primaryDisabledButtonClasses,
        ),
        disabled: okDisabled,
      }}
      okText={ui.okText}
      open={isOpen}
      title={ui.title}
      onCancel={cancel}
      onOk={submit}
    >
      <div className="flex flex-col gap-1 mt-4">
        <label className="text-xs text-text-secondary" htmlFor="newName">
          {ui.label}
        </label>
        <Form form={form}>
          <Form.Item
            help={error}
            name="newName"
            validateStatus={error ? 'error' : ''}
            validateTrigger={['onBlur']}
          >
            <Input
              className={cx('h-12 my-3', inputClasses)}
              id={ui.inputId}
              placeholder={ui.placeholder}
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onPressEnter={() => !okDisabled && submit()}
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}
