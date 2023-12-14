import { Input, InputRef, Modal } from 'antd';
import {
  ChangeEvent,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { KeyboardCode } from '@frontend/common';

import { ModalRefFunction } from '../../common';
import { ProjectContext } from '../../context';
import { useApi } from '../../hooks';
import { createUniqueName } from '../../services';
type Props = {
  newSheetModal: { current: ModalRefFunction | null };
};

export function NewSheet({ newSheetModal }: Props) {
  const { projectName, sheetName, updateSheetContent, projectSheets } =
    useContext(ProjectContext);
  const { closeWorksheet } = useApi();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');
  const inputRef = useRef<InputRef | null>(null);

  const showModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleOk = useCallback(() => {
    if (projectName && newSheetName) {
      if (sheetName) {
        closeWorksheet(projectName, sheetName);
      }

      const uniqueSheetName = createUniqueName(
        newSheetName,
        (projectSheets || []).map(({ sheetName }) => sheetName)
      );

      updateSheetContent(uniqueSheetName, '');
    }
    setIsModalOpen(false);
    setNewSheetName('');
  }, [
    projectName,
    newSheetName,
    sheetName,
    projectSheets,
    updateSheetContent,
    closeWorksheet,
  ]);

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
        cursor: 'start',
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
      okButtonProps={{
        className: 'bg-blue-500 enabled:hover:bg-blue-700',
        disabled: !newSheetName,
      }}
      open={isModalOpen}
      title="New Worksheet"
      onCancel={handleCancel}
      onOk={handleOk}
    >
      <Input
        placeholder="worksheet name"
        ref={inputRef}
        value={newSheetName}
        autoFocus
        onChange={onSheetNameChange}
      />
    </Modal>
  );
}
