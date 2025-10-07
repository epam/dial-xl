import { DataNode } from 'antd/es/tree';
import { useCallback, useEffect, useState } from 'react';

import { csvFileExtension } from '@frontend/common';

import { useDND, useRequestDimTable } from '../../../hooks';
import { InputChildData } from './useInputsContextMenu';

export const useInputsDragDrop = (childData: InputChildData) => {
  const { getDropCell, handleDragEnd, handleDragOver } = useDND();
  const { requestDimSchemaForDimFormula } = useRequestDimTable();

  const [draggedPath, setDraggedPath] = useState<string>('');

  const handleDrop = useCallback(
    (e: DragEvent) => {
      const dropCell = getDropCell(e);

      if (!dropCell || !draggedPath) return;

      e.preventDefault();

      const { col, row } = dropCell;
      const formula = `:INPUT("${draggedPath}")`;
      const newTableName = Object.values(childData)
        .find((file) => file.url === draggedPath)
        ?.name.replaceAll(csvFileExtension, '');

      requestDimSchemaForDimFormula(col, row, formula, newTableName);

      setDraggedPath('');

      handleDragEnd();
    },
    [
      requestDimSchemaForDimFormula,
      draggedPath,
      getDropCell,
      handleDragEnd,
      childData,
    ]
  );

  const onDragOver = useCallback(
    (e: DragEvent) => {
      if (!draggedPath) return;

      e.preventDefault();
      handleDragOver(e);
    },
    [draggedPath, handleDragOver]
  );

  const onDragStart = useCallback(
    (node: DataNode, ev: React.DragEvent) => {
      const key = node.key as string;
      if (!childData[key]) {
        setDraggedPath('');

        return;
      }

      const el = document.getElementById(`dragged-image-${node.key}`);
      if (el) {
        ev.dataTransfer!.setDragImage(el, 20, 20);
      }
      const input = childData[key];
      setDraggedPath(input.url);
    },
    [childData]
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
