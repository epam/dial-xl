import { Modal } from 'antd';
import cx from 'classnames';
import { useCallback, useContext, useEffect, useState } from 'react';

import {
  KeyboardCode,
  modalFooterButtonClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  secondaryButtonClasses,
} from '@frontend/common';
import { focusSpreadsheet } from '@frontend/spreadsheet';

import { DeleteModalRefFunction } from '../../../common';
import { ProjectContext } from '../../../context';

type Props = {
  deleteSheetModal: { current: DeleteModalRefFunction | null };
};

export function DeleteSheet({ deleteSheetModal }: Props) {
  const { projectName, deleteSheet } = useContext(ProjectContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sheetName, setSheetName] = useState<string | null>(null);

  const showModal = useCallback(({ name }: { name: string }) => {
    setIsModalOpen(true);

    setSheetName(name);
  }, []);

  const handleOk = useCallback(() => {
    if (projectName && sheetName) {
      deleteSheet({ sheetName: sheetName, silent: true });
    }
    setIsModalOpen(false);
  }, [deleteSheet, projectName, sheetName]);

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
    deleteSheetModal.current = showModal;
  }, [showModal, deleteSheetModal]);

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
      }}
      open={isModalOpen}
      title="Confirm"
      onCancel={handleCancel}
      onOk={handleOk}
    >
      <span className="text-textPrimary">
        Do you want to remove sheet {sheetName}?
      </span>
    </Modal>
  );
}
