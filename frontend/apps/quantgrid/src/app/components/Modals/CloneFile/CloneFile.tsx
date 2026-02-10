import { Input, InputRef, Modal } from 'antd';
import cx from 'classnames';
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  dialProjectFileExtension,
  inputClasses,
  KeyboardCode,
  MetadataNodeType,
  modalFooterButtonClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  secondaryButtonClasses,
  shouldStopPropagation,
} from '@frontend/common';

import { useApiRequests, useCloneResources } from '../../../hooks';
import { createUniqueFileName } from '../../../services';
import { DashboardItem } from '../../../types/dashboard';
import { isEntityNameInvalid } from '../../../utils';

type Props = {
  item: DashboardItem;
  onModalClose: () => void;
};

export function CloneFile({ item, onModalClose }: Props) {
  const { getFiles } = useApiRequests();
  const { cloneResources } = useCloneResources();

  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [newFileName, setNewFileName] = useState<string | null>(null);
  const inputRef = useRef<InputRef | null>(null);

  const isProject = useMemo(
    () => item.name.endsWith(dialProjectFileExtension),
    [item.name]
  );

  const initialFileName = useMemo(() => {
    return isProject
      ? item.name.substring(0, item.name.lastIndexOf('.'))
      : item.name;
  }, [isProject, item.name]);

  const onNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (isEntityNameInvalid(event.target.value, true)) return;

    setNewFileName(event.target.value);
  }, []);

  const handleCloneFile = useCallback(async () => {
    if (!newFileName) return;

    const { name, bucket, parentPath } = item;

    await cloneResources({
      items: [
        {
          name,
          bucket,
          parentPath,
          newName: newFileName,
        },
      ],
    });
  }, [item, newFileName, cloneResources]);

  const handleOk = useCallback(async () => {
    setLoading(true);
    await handleCloneFile();
    setIsOpen(false);
    onModalClose();
    setLoading(false);
  }, [handleCloneFile, onModalClose]);

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

  const initNewFileName = useCallback(async () => {
    if (newFileName !== null) return;

    const allFilesInDestination = await getFiles({
      path: `${item.bucket}/${item.parentPath ? item.parentPath + '/' : ''}`,
      suppressErrors: true,
    });

    const fileNamesInDestination = (allFilesInDestination ?? [])
      .filter((f) => f.nodeType !== MetadataNodeType.FOLDER)
      .map((file) => file.name);
    const targetName = fileNamesInDestination.includes(item.name)
      ? createUniqueFileName(initialFileName, fileNamesInDestination)
      : initialFileName;

    setNewFileName(targetName);
  }, [getFiles, initialFileName, item, newFileName]);

  useEffect(() => {
    initNewFileName();
  }, [initNewFileName, initialFileName]);

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
      title="Clone file"
      onCancel={handleCancel}
      onOk={handleOk}
    >
      <div className="flex flex-col gap-1 mt-4">
        <label className="text-xs text-text-secondary" htmlFor="projectName">
          {isProject ? 'Project' : 'File'} name after cloning
        </label>
        <div className="flex gap-2 items-center relative">
          <Input
            className={cx('h-12 my-3', inputClasses, isProject && 'pr-12')}
            placeholder={isProject ? 'Project name' : 'File name'}
            ref={inputRef}
            value={newFileName || ''}
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
