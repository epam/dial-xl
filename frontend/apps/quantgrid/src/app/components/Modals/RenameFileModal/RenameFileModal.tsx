import { Input, InputRef, Modal } from 'antd';
import cx from 'classnames';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

import {
  dialProjectFileExtension,
  inputClasses,
  KeyboardCode,
  modalFooterButtonClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  secondaryButtonClasses,
  shouldStopPropagation,
} from '@frontend/common';

import { useRenameFile } from '../../../hooks';
import { DashboardItem } from '../../../types/dashboard';
import { isEntityNameInvalid } from '../../../utils';

type Props = {
  item: DashboardItem;
  onModalClose: () => void;
};

export function RenameFileModal({ item, onModalClose }: Props) {
  const isProject = item.name.endsWith(dialProjectFileExtension);
  const initialFileName = isProject
    ? item.name.substring(0, item.name.lastIndexOf('.'))
    : item.name;
  const { renameFile } = useRenameFile();

  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [newFileName, setNewFileName] = useState(initialFileName);
  const inputRef = useRef<InputRef | null>(null);

  const onNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (isEntityNameInvalid(event.target.value, true)) return;

    setNewFileName(event.target.value);
  }, []);

  const handleRenameFile = useCallback(async () => {
    const { name, bucket, parentPath } = item;

    await renameFile({
      name,
      bucket,
      parentPath,
      newName: newFileName,
      newNameIsFull: true,
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
      setLoading(true);
      await handleRenameFile();
      setIsOpen(false);
      onModalClose();
      setLoading(false);
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
        newFileName !== initialFileName &&
        !isEntityNameInvalid(newFileName)
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
      inputRef.current.select();
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
      cancelButtonProps={{
        className: cx(modalFooterButtonClasses, secondaryButtonClasses),
        disabled: loading,
      }}
      destroyOnHidden={true}
      okButtonProps={{
        className: cx(
          modalFooterButtonClasses,
          primaryButtonClasses,
          primaryDisabledButtonClasses
        ),
        disabled:
          !newFileName ||
          newFileName === initialFileName ||
          isEntityNameInvalid(newFileName),
        loading,
      }}
      open={isOpen}
      title="Rename file"
      onCancel={handleCancel}
      onOk={handleOk}
    >
      <div className="flex flex-col gap-1 mt-4">
        <label className="text-xs text-text-secondary" htmlFor="projectName">
          {isProject ? 'Project' : 'File'} name after renaming
        </label>
        <div className="flex gap-2 items-center relative">
          <Input
            className={cx('h-12 my-3', inputClasses, isProject && 'pr-12')}
            placeholder={isProject ? 'Project name' : 'File name'}
            ref={inputRef}
            value={newFileName}
            autoFocus
            onChange={onNameChange}
          />
          {isProject && (
            <span className="absolute right-4 top-[calc(50%-10px)]">
              {dialProjectFileExtension}
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
}
