import { DataNode } from 'antd/es/tree';

import Icon from '@ant-design/icons';
import {
  ColumnsIcon,
  CommonMetadata,
  CSVFileIcon,
  FolderIcon,
  MetadataNodeType,
} from '@frontend/common';

import { draggedImageIdPrefix, InputChildData } from '../hooks';

export interface BuildCSVTreeParams {
  input: CommonMetadata;
  fields: string[];
  key: string;
}

export interface BuildCSVTreeResult {
  node: DataNode;
  childData: InputChildData;
}

export function buildCSVTree({
  input,
  fields,
  key,
}: BuildCSVTreeParams): BuildCSVTreeResult {
  const { name, nodeType } = input;
  const LeafIcon =
    nodeType === MetadataNodeType.FOLDER ? (
      <Icon
        className="text-stroke-accent-secondary w-[18px]"
        component={() => <FolderIcon />}
      />
    ) : (
      <Icon
        className="text-stroke-accent-secondary w-[18px]"
        component={() => <CSVFileIcon />}
        id={`${draggedImageIdPrefix}${key}`}
      />
    );

  const node: DataNode = {
    key,
    title: name,
    icon: LeafIcon,
    isLeaf: nodeType === MetadataNodeType.FOLDER,
    children: fields.map((fieldName, index) => ({
      key: key + '-' + index,
      title: fieldName,
      isLeaf: true,
      icon: (
        <Icon
          className="size-[18px] text-text-secondary"
          component={() => <ColumnsIcon />}
        />
      ),
    })),
  };

  const childData: InputChildData = {
    [key]: input,
  };

  return { node, childData };
}
