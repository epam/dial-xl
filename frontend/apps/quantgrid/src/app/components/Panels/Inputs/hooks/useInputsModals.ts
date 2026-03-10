import { useCallback, useState } from 'react';

import { CommonMetadata } from '@frontend/common';

export interface UseInputsModalsResult {
  renameItem: CommonMetadata | undefined;
  moveItem: CommonMetadata | undefined;
  cloneItem: CommonMetadata | undefined;
  onRename: (item: CommonMetadata) => void;
  onMove: (item: CommonMetadata) => void;
  onClone: (item: CommonMetadata) => void;
  closeRenameModal: () => void;
  closeMoveModal: () => void;
  closeCloneModal: () => void;
}

export function useInputsModals(): UseInputsModalsResult {
  const [renameItem, setRenameItem] = useState<CommonMetadata>();
  const [moveItem, setMoveItem] = useState<CommonMetadata>();
  const [cloneItem, setCloneItem] = useState<CommonMetadata>();

  const onRename = useCallback((item: CommonMetadata) => {
    setRenameItem(item);
  }, []);

  const onMove = useCallback((item: CommonMetadata) => {
    setMoveItem(item);
  }, []);

  const onClone = useCallback((item: CommonMetadata) => {
    setCloneItem(item);
  }, []);

  const closeRenameModal = useCallback(() => {
    setRenameItem(undefined);
  }, []);

  const closeMoveModal = useCallback(() => {
    setMoveItem(undefined);
  }, []);

  const closeCloneModal = useCallback(() => {
    setCloneItem(undefined);
  }, []);

  return {
    renameItem,
    moveItem,
    cloneItem,
    onRename,
    onMove,
    onClone,
    closeRenameModal,
    closeMoveModal,
    closeCloneModal,
  };
}
