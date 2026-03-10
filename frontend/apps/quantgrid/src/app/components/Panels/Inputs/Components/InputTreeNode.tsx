import { DataNode } from 'antd/es/tree';

import Icon from '@ant-design/icons';
import { DragIcon, MetadataNodeType } from '@frontend/common';

import { excelTreeKey, importTreeKey, InputChildData } from '../hooks';

export interface InputTreeNodeProps {
  node: DataNode;
  childData: InputChildData;
  hoverKey: string;
  onDragStart: (node: DataNode, ev: React.DragEvent) => void;
  onDoubleClick: (key: string) => void;
}

export function InputTreeNode({
  node,
  childData,
  hoverKey,
  onDragStart,
  onDoubleClick,
}: InputTreeNodeProps) {
  const key = node.key as string;
  const isCSVFile =
    childData[key]?.nodeType === MetadataNodeType.ITEM &&
    !key.startsWith(excelTreeKey.file);
  const isImportCatalog = key.startsWith(importTreeKey.catalog);
  const isExcelDraggableItems =
    key.startsWith(excelTreeKey.sheet) ||
    key.startsWith(excelTreeKey.table) ||
    key.startsWith(excelTreeKey.file);
  const isDraggable = isCSVFile || isImportCatalog || isExcelDraggableItems;

  return (
    <div
      className="flex w-full items-center justify-between select-none"
      data-path={node.key}
      draggable={isDraggable}
      key={node.key}
      onDoubleClick={() => onDoubleClick(key)}
      onDragStart={(ev) => onDragStart(node, ev)}
    >
      <div className="inline-block overflow-hidden whitespace-nowrap text-ellipsis">
        {node.title as string}
      </div>
      {hoverKey === node.key && isDraggable && (
        <div className="flex items-center pointer-events-none">
          <Icon
            className="w-[18px] text-text-secondary mr-1"
            component={() => <DragIcon />}
          />

          <span className="text-[13px] text-text-secondary">Drag</span>
        </div>
      )}
    </div>
  );
}
