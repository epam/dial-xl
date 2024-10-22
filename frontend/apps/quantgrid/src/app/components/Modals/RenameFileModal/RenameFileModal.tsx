import { Input, InputRef, Modal } from 'antd';
import cx from 'classnames';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

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

import { useRenameFile } from '../../../hooks';
import { DashboardItem } from '../../../types/dashboard';
import { isEntityNameInvalid } from '../../../utils';

type Props = {
  item: DashboardItem;
  onModalClose: () => void;
};

export function RenameFileModal({ item, onModalClose }: Props) {
  const initialFileName = item.name.substring(0, item.name.lastIndexOf('.'));
  const { renameFile } = useRenameFile();

  const [isOpen, setIsOpen] = useState(true);
  const [newFileName, setNewFileName] = useState(initialFileName);
  const inputRef = useRef<InputRef | null>(null);

  const onNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (isEntityNameInvalid(event.target.value)) return;

    setNewFileName(event.target.value);
  }, []);

  const handleRenameFile = useCallback(async () => {
    const { name, bucket, parentPath } = item;

    await renameFile({
      name,
      bucket,
      path: parentPath,
      newName: newFileName,
    });
  }, [item, newFileName, renameFile]);

  const handleOk = useCallback(async () => {
    if (item.isSharedByMe) {
      Modal.confirm({
        icon: null,
        title: 'Confirm renaming',
        content: `Renaming will stop sharing and other users will no longer see this file`,
        okButtonProps: {
          className: cx(modalFooterButtonClasses, primaryButtonClasses),
        },
        cancelButtonProps: {
          className: cx(modalFooterButtonClasses, secondaryButtonClasses),
        },
        onOk: async () => {
          await handleRenameFile();
          setIsOpen(false);
          onModalClose();
        },
        onCancel: () => {
          setIsOpen(false);
          onModalClose();
        },
      });
    } else {
      await handleRenameFile();
      setIsOpen(false);
      onModalClose();
    }
  }, [handleRenameFile, item.isSharedByMe, onModalClose]);

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (shouldStopPropagation(event)) {
        event.stopPropagation();
      }
      if (
        event.key === KeyboardCode.Enter &&
        newFileName &&
        newFileName !== initialFileName
      ) {
        handleOk();
      }
    },
    [handleOk, initialFileName, isOpen, newFileName]
  );

  useEffect(() => {
    setTimeout(() => {
      if (!inputRef.current || !isOpen) return;

      inputRef.current.focus({
        cursor: 'end',
      });
    }, 0);
  }, [isOpen]);

  useEffect(() => {
    window.addEventListener('keydown', onKeydown);

    return () => {
      window.removeEventListener('keydown', onKeydown);
    };
  }, [onKeydown]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    onModalClose();
  }, [onModalClose]);

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
        disabled: !newFileName || newFileName === initialFileName,
      }}
      open={isOpen}
      title="Rename file"
      onCancel={handleCancel}
      onOk={handleOk}
    >
      <Input
        className={cx('h-12 my-3', inputClasses)}
        placeholder="File name"
        ref={inputRef}
        value={newFileName}
        autoFocus
        onChange={onNameChange}
      />
    </Modal>
  );
}
