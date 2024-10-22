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
import { focusSpreadsheet } from '@frontend/spreadsheet';

import { ModalRefFunction } from '../../../common';
import { defaultSheetName, ProjectContext } from '../../../context';
import { createUniqueName } from '../../../services';
type Props = {
  newSheetModal: { current: ModalRefFunction | null };
};

export function NewSheet({ newSheetModal }: Props) {
  const { projectName, createSheet, projectSheets } =
    useContext(ProjectContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');
  const inputRef = useRef<InputRef | null>(null);

  const suggestSheetName = useCallback(() => {
    const uniqueSheetName = createUniqueName(
      defaultSheetName,
      (projectSheets || []).map(({ sheetName }) => sheetName)
    );

    setNewSheetName(uniqueSheetName);
  }, [projectSheets]);

  const showModal = useCallback(() => {
    setIsModalOpen(true);
    suggestSheetName();
  }, [suggestSheetName]);

  const handleOk = useCallback(() => {
    if (projectName && newSheetName) {
      createSheet({ newName: newSheetName, silent: true });
    }
    setIsModalOpen(false);
    setNewSheetName('');
  }, [projectName, newSheetName, createSheet]);

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
    setNewSheetName('');
  }, []);

  const onSheetNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setNewSheetName(event.target.value);
    },
    []
  );

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (!isModalOpen) return;
      if (shouldStopPropagation(event)) {
        event.stopPropagation();
      }
      if (event.key === KeyboardCode.Enter && newSheetName) {
        handleOk();
      }
    },
    [handleOk, isModalOpen, newSheetName]
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
        disabled: !newSheetName,
      }}
      open={isModalOpen}
      title="New Worksheet"
      onCancel={handleCancel}
      onOk={handleOk}
    >
      <Input
        className={cx('h-12 my-3', inputClasses)}
        placeholder="Worksheet name"
        ref={inputRef}
        value={newSheetName}
        autoFocus
        onChange={onSheetNameChange}
      />
    </Modal>
  );
}
