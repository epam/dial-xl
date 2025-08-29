import { Form, Input, InputRef, Modal } from 'antd';
import cx from 'classnames';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

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

const inputFieldKey = 'newSheetName';

type Props = {
  renameSheetModal: { current: RenameModalRefFunction | null };
};

export function RenameSheet({ renameSheetModal }: Props) {
  const [form] = Form.useForm();
  const { renameSheet, projectSheets } = useContext(ProjectContext);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [oldSheetName, setOldSheetName] = useState('');
  const inputRef = useRef<InputRef | null>(null);

  const showModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleOk = useCallback(async () => {
    try {
      await form.validateFields({ recursive: true });
    } catch {
      return;
    }

    const newSheetName = form.getFieldValue(inputFieldKey);

    if (oldSheetName && newSheetName) {
      renameSheet({
        oldName: oldSheetName,
        newName: newSheetName,
        silent: true,
      });
    }
    setIsModalOpen(false);
    setOldSheetName('');
    form.resetFields();
  }, [form, oldSheetName, renameSheet]);

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
    setOldSheetName('');
    form.resetFields();
  }, [form]);

  const initModal = useCallback(
    (name: string) => {
      showModal();
      setOldSheetName(name);
      form.setFieldValue(inputFieldKey, name);
    },
    [form, showModal]
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
    [isModalOpen, handleOk]
  );

  useEffect(() => {
    renameSheetModal.current = initModal;
  }, [initModal, renameSheetModal]);

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
      }}
      open={isModalOpen}
      title="Rename Worksheet"
      onCancel={handleCancel}
      onOk={handleOk}
    >
      <Form className="pb-2" form={form}>
        <Form.Item
          name="newSheetName"
          rules={[
            { required: true, message: 'Sheet name is required' },
            {
              validator: (_, value) => {
                const result = !projectSheets?.some(
                  (sheet) => sheet.sheetName === value
                );

                return result
                  ? Promise.resolve()
                  : Promise.reject(
                      new Error('A worksheet with this name already exists.')
                    );
              },
            },
          ]}
          validateTrigger={['onBlur']}
        >
          <Input
            className={cx('h-12 my-3', inputClasses)}
            placeholder="Sheet name"
            ref={inputRef}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
