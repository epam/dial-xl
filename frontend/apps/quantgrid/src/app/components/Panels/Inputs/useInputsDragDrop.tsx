import { DataNode } from 'antd/es/tree';
import { useCallback, useEffect, useState } from 'react';

import { csvFileExtension } from '@frontend/common';

import { useDND, useRequestDimTable } from '../../../hooks';
import { useCreateTableFromImportModalStore } from '../../../store';
import { importTreeKey, InputChildData } from './useInputsContextMenu';

type DraggedItem = {
  type: 'file' | 'import-catalog';
  path?: string;
  sourceKey?: string;
  datasetKey?: string;
  sourceName?: string;
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
      const { type, datasetKey, sourceKey, sourceName, path } = draggedItem;

      if (type === 'file' && path) {
        const formula = `:INPUT("${path}")`;
        const newTableName = Object.values(childData)
          .find((file) => file.url === path)
          ?.name.replaceAll(csvFileExtension, '');

        requestDimSchemaForDimFormula(col, row, formula, newTableName);
      } else if (
        type === 'import-catalog' &&
        sourceKey &&
        datasetKey &&
        sourceName
      ) {
        useCreateTableFromImportModalStore
          .getState()
          .open(sourceKey, datasetKey, sourceName, col, row);
      }

      setDraggedItem(null);
      handleDragEnd();
    },
    [
      requestDimSchemaForDimFormula,
      draggedItem,
      getDropCell,
      handleDragEnd,
      childData,
    ]
  );

  const onDragOver = useCallback(
    (e: DragEvent) => {
      if (!draggedItem) return;

      e.preventDefault();
      handleDragOver(e);
    },
    [draggedItem, handleDragOver]
  );

  const onDragStart = useCallback(
    (node: DataNode, ev: React.DragEvent) => {
      const key = node.key as string;

      if (key.startsWith(importTreeKey.catalog)) {
        const entityKey = key.replace(importTreeKey.catalog, '');
        const [sourceKey, datasetKey, sourceName] = entityKey.split(':');

        if (sourceKey && datasetKey && sourceName) {
          const el = document.getElementById(`dragged-image-${node.key}`);
          if (el) {
            ev.dataTransfer!.setDragImage(el, 20, 20);
          }

          setDraggedItem({
            type: 'import-catalog',
            sourceKey,
            datasetKey,
            sourceName,
          });

          return;
        }
      }

      if (!childData[key]) {
        setDraggedItem(null);

        return;
      }

      const el = document.getElementById(`dragged-image-${node.key}`);
      if (el) {
        ev.dataTransfer!.setDragImage(el, 20, 20);
      }

      const input = childData[key];
      setDraggedItem({
        type: 'file',
        path: input.url,
      });
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
