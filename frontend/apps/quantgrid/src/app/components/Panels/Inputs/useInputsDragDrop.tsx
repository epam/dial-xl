import { DataNode } from 'antd/es/tree';
import { useCallback, useEffect, useState } from 'react';

import { useDND, useRequestDimTable } from '../../../hooks';
import { InputChildData } from './useInputsContextMenu';

export const useInputsDragDrop = (childData: InputChildData) => {
  const { getDropCell, handleDragEnd, handleDragOver } = useDND();
  const { createDimTableFromDimensionFormula } = useRequestDimTable();

  const [draggedPath, setDraggedPath] = useState<string>('');

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();

      const dropCell = getDropCell(e);

      if (!dropCell || !draggedPath) return;

      const { col, row } = dropCell;
      const formula = `:INPUT("${draggedPath}")`;
      createDimTableFromDimensionFormula(col, row, formula);

      setDraggedPath('');

      handleDragEnd();
    },
    [
      createDimTableFromDimensionFormula,
      draggedPath,
      getDropCell,
      handleDragEnd,
    ]
  );

  const onDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();

      if (!draggedPath) return;

      handleDragOver(e);
    },
    [draggedPath, handleDragOver]
  );

  const onDragStart = useCallback(
    (node: DataNode) => {
      const key = node.key as string;
      if (!childData[key]) {
        setDraggedPath('');

        return;
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
