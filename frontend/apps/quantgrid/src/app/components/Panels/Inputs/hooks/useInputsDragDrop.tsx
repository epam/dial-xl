import { DataNode } from 'antd/es/tree';
import { useCallback, useEffect, useState } from 'react';

import { useDND, useRequestDimTable } from '../../../../hooks';
import {
  useCreateTableFromImportModalStore,
  useExcelPreviewStore,
} from '../../../../store';
import { createTableFromInput, InputType } from '../utils';
import {
  excelSheetKey,
  excelTableKey,
  excelTreeKey,
  importTreeKey,
  InputChildData,
} from './contextMenuTypes';

export const draggedImageIdPrefix = 'dragged-image-';

type DraggedItem = {
  inputType: InputType;
  fileUrl?: string;
  sourceKey?: string;
  datasetKey?: string;
  sourceName?: string;
  excelEntityName?: string;
};

export const useInputsDragDrop = (childData: InputChildData) => {
  const { getDropCell, handleDragEnd, handleDragOver } = useDND();
  const { requestDimSchemaForDimFormula } = useRequestDimTable();

  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      const dropCell = getDropCell(e);

      if (!dropCell || !draggedItem) return;

      e.preventDefault();

      const { col, row } = dropCell;
      const {
        inputType,
        fileUrl,
        sourceKey,
        datasetKey,
        sourceName,
        excelEntityName,
      } = draggedItem;

      // Find the file metadata
      const file = fileUrl
        ? Object.values(childData).find((f) => f.url === fileUrl)
        : undefined;

      createTableFromInput({
        type: inputType,
        file,
        excelEntityName,
        sourceKey,
        datasetKey,
        sourceName,
        col,
        row,
        onCreateFormula: requestDimSchemaForDimFormula,
        onOpenImportModal: (sk, dk, sn, c, r) =>
          useCreateTableFromImportModalStore.getState().open(sk, dk, sn, c, r),
        onOpenExcelModal: (f, n, c, r) =>
          useExcelPreviewStore.getState().open(f, n, c, r),
      });

      setDraggedItem(null);
      handleDragEnd();
    },
    [
      requestDimSchemaForDimFormula,
      draggedItem,
      getDropCell,
      handleDragEnd,
      childData,
    ],
  );

  const onDragOver = useCallback(
    (e: DragEvent) => {
      if (!draggedItem) return;

      e.preventDefault();
      handleDragOver(e);
    },
    [draggedItem, handleDragOver],
  );

  const onDragStart = useCallback(
    (node: DataNode, ev: React.DragEvent) => {
      const key = node.key as string;

      // Set drag image
      const el = document.getElementById(`${draggedImageIdPrefix}${node.key}`);
      if (el) {
        ev.dataTransfer!.setDragImage(el, 20, 20);
      }

      // Handle import catalog
      if (key.startsWith(importTreeKey.catalog)) {
        const entityKey = key.replace(importTreeKey.catalog, '');
        const [sourceKey, datasetKey, sourceName] = entityKey.split(':');

        if (sourceKey && datasetKey && sourceName) {
          setDraggedItem({
            inputType: 'import-catalog',
            sourceKey,
            datasetKey,
            sourceName,
          });

          return;
        }
      }

      // Check if a file exists in childData
      const input = childData[key];
      if (!input) {
        setDraggedItem(null);

        return;
      }

      // Handle Excel sheet or table
      if (
        key.startsWith(excelTreeKey.sheet) ||
        key.startsWith(excelTreeKey.table)
      ) {
        const parsedEntityName = key.split(':');

        if (parsedEntityName.length < 2) {
          setDraggedItem(null);

          return;
        }

        const excelEntityName = parsedEntityName[parsedEntityName.length - 1];
        const inputType: InputType = key.startsWith(excelTreeKey.sheet)
          ? excelSheetKey
          : excelTableKey;

        setDraggedItem({
          inputType,
          fileUrl: input.url,
          excelEntityName,
        });

        return;
      }

      // Entire excel file
      if (key.startsWith(excelTreeKey.file)) {
        setDraggedItem({
          inputType: 'excel-file',
          fileUrl: input.url,
        });

        return;
      }

      // Handle CSV file
      setDraggedItem({
        inputType: 'csv',
        fileUrl: input.url,
      });
    },
    [childData],
  );

  useEffect(() => {
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragend', handleDragEnd);

    return () => {
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('drop', handleDrop);
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, [handleDrop, handleDragEnd, onDragOver]);

  return { onDragStart };
};
