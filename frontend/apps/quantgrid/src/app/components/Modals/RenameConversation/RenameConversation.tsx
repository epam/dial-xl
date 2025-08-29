import { Form, Input, InputRef, Modal } from 'antd';
import cx from 'classnames';
import { useCallback, useContext, useEffect, useRef } from 'react';

import {
  inputClasses,
  KeyboardCode,
  modalFooterButtonClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  secondaryButtonClasses,
  shouldStopPropagation,
} from '@frontend/common';

import { ChatOverlayContext } from '../../../context';

const inputFieldKey = 'newConversationName';

type Props = {
  oldName: string;
  isOpened: boolean;
  onRename: (newName: string) => void;
  onCancel: () => void;
};

export function RenameConversation({
  isOpened,
  oldName,
  onRename,
  onCancel,
}: Props) {
  const [form] = Form.useForm();
  const { projectConversations } = useContext(ChatOverlayContext);

  const inputRef = useRef<InputRef | null>(null);

  const handleOk = useCallback(async () => {
    try {
      await form.validateFields({ recursive: true });
    } catch {
      return;
    }

    const newName = form.getFieldValue(inputFieldKey);
    if (oldName && newName) {
      onRename(newName);
    }
    form.resetFields();
  }, [form, oldName, onRename]);

  const handleCancel = useCallback(() => {
    onCancel();
    form.resetFields();
  }, [form, onCancel]);

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpened) return;
      if (shouldStopPropagation(event)) {
        event.stopPropagation();
      }

      if (event.key === KeyboardCode.Enter) {
        handleOk();
      }
    },
    [isOpened, handleOk]
  );

  useEffect(() => {
    if (isOpened) {
      form.setFieldsValue({ [inputFieldKey]: oldName });
    }
  }, [isOpened, oldName, form]);

  useEffect(() => {
    setTimeout(() => {
      if (!inputRef.current || !isOpened) return;

      inputRef.current.focus({
        cursor: 'end',
      });
    }, 0);
  }, [isOpened]);

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
      open={isOpened}
      title="Rename Conversation"
      onCancel={handleCancel}
      onOk={handleOk}
    >
      <Form className="pb-2" form={form}>
        <Form.Item
          name="newConversationName"
          rules={[
            { required: true, message: 'Conversation name is required' },
            {
              validator: (_, value) => {
                const result = !projectConversations?.some(
                  (i) => i.name === value
                );

                return result
                  ? Promise.resolve()
                  : Promise.reject(
                      new Error('A conversation with this name already exists.')
                    );
              },
            },
          ]}
          validateTrigger={['onBlur']}
        >
          <Input
            className={cx('h-12 my-3', inputClasses)}
            placeholder="Conversation name"
            ref={inputRef}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
