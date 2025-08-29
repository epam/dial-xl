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

import { ModalRefFunction } from '../../../common';
import { defaultSheetName, ProjectContext } from '../../../context';
import { createUniqueName } from '../../../services';

const inputFieldKey = 'newSheetName';

type Props = {
  newSheetModal: { current: ModalRefFunction | null };
};

export function NewSheet({ newSheetModal }: Props) {
  const [form] = Form.useForm();
  const { projectName, createSheet, projectSheets } =
    useContext(ProjectContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const inputRef = useRef<InputRef | null>(null);

  const suggestSheetName = useCallback(() => {
    const uniqueSheetName = createUniqueName(
      defaultSheetName,
      (projectSheets || []).map(({ sheetName }) => sheetName)
    );

    form.setFieldValue(inputFieldKey, uniqueSheetName);
  }, [form, projectSheets]);

  const showModal = useCallback(() => {
    setIsModalOpen(true);
    suggestSheetName();
  }, [suggestSheetName]);

  const handleOk = useCallback(async () => {
    try {
      await form.validateFields({ recursive: true });
    } catch {
      return;
    }

    const newSheetName = form.getFieldValue(inputFieldKey);

    if (projectName && newSheetName) {
      createSheet({ newName: newSheetName, silent: true });
    }
    setIsModalOpen(false);
    form.resetFields();
  }, [projectName, form, createSheet]);

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
    form.resetFields();
  }, [form]);

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

  useEffect(() => {
    newSheetModal.current = showModal;
  }, [showModal, newSheetModal]);

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
      title="New Worksheet"
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
