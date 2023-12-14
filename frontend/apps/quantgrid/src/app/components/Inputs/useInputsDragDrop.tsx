import { DataNode } from 'antd/es/tree';
import { useCallback, useEffect, useRef, useState } from 'react';
import { debounce } from 'ts-debounce';

import { useRequestDimTable } from '../../hooks';
import { InputChildData } from './useInputsContextMenu';

export const useInputsDragDrop = (childData: InputChildData) => {
  const { createDimTableFromFormula } = useRequestDimTable();
  const activeElement = useRef<HTMLElement | null>(null);

  const [draggedPath, setDraggedPath] = useState<string>('');

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();

      if (!e.target) return;

      const element = e.target as HTMLElement;

      const row = element.getAttribute('data-row');
      const col = element.getAttribute('data-col');

      if (!col || !row || !draggedPath) return;

      const formula = `:INPUT("${draggedPath}")`;
      createDimTableFromFormula(parseInt(col), parseInt(row), formula);
    },
    [createDimTableFromFormula, draggedPath]
  );

  const handleDragEnd = useCallback(() => {
    if (activeElement.current) {
      const el = activeElement.current as HTMLElement;

      el.style.outline = 'none';

      activeElement.current = null;
    }
  }, []);

  const preventDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragOver = debounce((e: DragEvent) => {
    e.preventDefault();

    const element = e.target as HTMLElement;
    const row = element.getAttribute('data-row');
    const col = element.getAttribute('data-col');

    if (!col || !row) {
      handleDragEnd();

      return;
    }

    if (activeElement.current) {
      const el = activeElement.current;

      el.style.outline = 'none';
    }

    element.style.outline = '2px solid #f4ce14';
    activeElement.current = element;
  }, 0);

  const onDragStart = useCallback(
    (node: DataNode) => {
      if (!childData[node.key]) {
        setDraggedPath('');

        return;
      }

      const path = childData[node.key].path || '';
      setDraggedPath(path);
    },
    [childData]
  );

  useEffect(() => {
    document.addEventListener('dragover', preventDragOver);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragend', handleDragEnd);

    return () => {
      document.removeEventListener('dragover', preventDragOver);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, [handleDrop, handleDragEnd, preventDragOver, handleDragOver]);

  return { onDragStart };
};
