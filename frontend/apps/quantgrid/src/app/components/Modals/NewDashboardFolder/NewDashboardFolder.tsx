import { Input, InputRef, Modal } from 'antd';
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

import { NewFolderModalRefFunction } from '../../../common';
import { DashboardContext } from '../../../context';
import { createUniqueName } from '../../../services';
import { isEntityNameInvalid } from '../../../utils';

type Props = {
  newFolderModal: { current: NewFolderModalRefFunction | null };
};

const defaultFolderName = 'New folder';

export function NewDashboardFolder({ newFolderModal }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const inputRef = useRef<InputRef | null>(null);

  const pathRef = useRef<string | null>(null);
  const bucketRef = useRef<string | null>(null);

  const { displayedDashboardItems, createEmptyFolder } =
    useContext(DashboardContext);

  const suggestFolderName = useCallback(() => {
    const uniqueFolderName = createUniqueName(
      defaultFolderName,
      displayedDashboardItems
        .filter(({ nodeType }) => nodeType === 'FOLDER')
        .map(({ name }) => name)
    );

    setNewFolderName(uniqueFolderName);
  }, [displayedDashboardItems]);

  const showModal: NewFolderModalRefFunction = useCallback(
    ({ path, bucket }: { path: string | null; bucket: string }) => {
      pathRef.current = path;
      bucketRef.current = bucket;

      setIsModalOpen(true);
      suggestFolderName();
    },
    [suggestFolderName]
  );

  const handleOk = useCallback(() => {
    if (newFolderName && bucketRef.current) {
      createEmptyFolder({
        path: pathRef.current,
        bucket: bucketRef.current,
        newFolderName,
        silent: true,
      });
    }
    setIsModalOpen(false);
    setNewFolderName('');
  }, [newFolderName, createEmptyFolder]);

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
    setNewFolderName('');
  }, []);

  const onFolderNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (isEntityNameInvalid(event.target.value)) return;

      setNewFolderName(event.target.value);
    },
    []
  );

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (!isModalOpen) return;
      if (shouldStopPropagation(event)) {
        event.stopPropagation();
      }
      if (event.key === KeyboardCode.Enter && newFolderName) {
        handleOk();
      }
    },
    [handleOk, isModalOpen, newFolderName]
  );

  useEffect(() => {
    newFolderModal.current = showModal;
  }, [showModal, newFolderModal]);

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
        disabled: !newFolderName,
      }}
      open={isModalOpen}
      title="New Folder"
      onCancel={handleCancel}
      onOk={handleOk}
    >
      <Input
        className={cx('h-12 my-3', inputClasses)}
        placeholder="Folder name"
        ref={inputRef}
        value={newFolderName}
        autoFocus
        onChange={onFolderNameChange}
      />
    </Modal>
  );
}
