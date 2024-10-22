import { useCallback, useContext, useEffect } from 'react';

import { InputsContext } from '../context';
import { useDND } from './useDND';

export const useDNDSpreadsheetFile = () => {
  const { getDropCell, handleDragEnd, handleDragOver } = useDND();
  const { uploadFiles } = useContext(InputsContext);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();

      const files = e.dataTransfer?.files;

      if (!files || !files.length) return;

      const dropCell = getDropCell(e);

      if (!dropCell) return;

      const { col, row } = dropCell;

      uploadFiles({ files, col: col, row: row });

      handleDragEnd();
    },
    [getDropCell, handleDragEnd, uploadFiles]
  );

  useEffect(() => {
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragend', handleDragEnd);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, [handleDrop, handleDragEnd, handleDragOver]);
};
