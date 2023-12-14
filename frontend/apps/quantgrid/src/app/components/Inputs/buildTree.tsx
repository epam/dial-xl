import { DataNode } from 'antd/es/tree';

import {
  DatabaseOutlined,
  FileOutlined,
  FolderOutlined,
} from '@ant-design/icons';

import { InputChildData } from './useInputsContextMenu';

export function buildTree(
  paths: string[],
  initialPaths: string[],
  inputName: string,
  fields: string[],
  parentKey: string | number,
  tree: DataNode[],
  childData: InputChildData
) {
  const key = `${parentKey}-${tree.length}`;

  if (paths.length === 0) {
    tree.push({
      key,
      title: inputName,
      icon: <FileOutlined />,
      isLeaf: !fields.length,
      children: fields.map((fieldName, index) => ({
        key: key + '-' + index,
        title: fieldName,
        isLeaf: true,
        icon: <DatabaseOutlined />,
      })),
    });

    const path =
      initialPaths.length > 0
        ? `${initialPaths.join('/')}/${inputName}`
        : inputName;

    childData[key] = {
      path,
    };

    return;
  }

  const [currentPath, ...remainingPaths] = paths;
  const defaultNode = {
    key,
    title: currentPath,
    children: [],
    icon: <FolderOutlined />,
  };
  const currentNode =
    tree.find((node) => node.title === currentPath) || defaultNode;

  if (!tree.includes(currentNode)) {
    tree.push(currentNode);
  }

  buildTree(
    remainingPaths,
    initialPaths,
    inputName,
    fields,
    currentNode.key,
    currentNode.children as DataNode[],
    childData
  );
}
