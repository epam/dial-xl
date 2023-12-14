import { Dropdown, Tree } from 'antd';
import type { DataNode, EventDataNode } from 'antd/es/tree';
import { useCallback, useContext, useEffect, useState } from 'react';

import { DownOutlined } from '@ant-design/icons';

import { InputsContext } from '../../context';
import { buildTree } from './buildTree';
import { InputChildData, useInputsContextMenu } from './useInputsContextMenu';
import { useInputsDragDrop } from './useInputsDragDrop';

const rootTreeKey = '0';

export function Inputs() {
  const { inputList, inputs } = useContext(InputsContext);

  const [inputTree, setInputTree] = useState<DataNode[]>([]);
  const [childData, setChildData] = useState<InputChildData>({});

  const { createContextMenuItems, items, onContextMenuClick } =
    useInputsContextMenu();
  const { onDragStart } = useInputsDragDrop(childData);

  const onSelect = useCallback((node: EventDataNode<DataNode>) => {
    if (!node.isLeaf) return;
  }, []);

  useEffect(() => {
    if (!inputList) return;

    const tree: DataNode[] = [];
    const childData: InputChildData = {};

    inputList.forEach((input) => {
      const paths = input?.paths || [];

      const path =
        paths.length > 0
          ? paths.join('/') + '/' + input.inputName
          : input.inputName;

      const fields = inputs[path]?.fields || [];

      buildTree(
        paths,
        paths,
        input.inputName,
        fields,
        rootTreeKey,
        tree,
        childData
      );
    });

    setInputTree(tree);
    setChildData(childData);
  }, [inputList, inputs]);

  if (!inputList || inputList.length === 0) {
    return <span className="w-full text-center pt-3">No inputs</span>;
  }

  return (
    <div className="overflow-auto w-full h-full">
      <div className="min-w-[200px] pl-3 relative">
        <Dropdown
          menu={{ items, onClick: onContextMenuClick }}
          trigger={['contextMenu']}
        >
          <Tree.DirectoryTree
            defaultExpandAll={true}
            draggable={false}
            icon={false}
            multiple={false}
            selectable={false}
            switcherIcon={<DownOutlined />}
            titleRender={(node) => (
              <div
                className="inline"
                data-path={node.key}
                draggable={!!childData[node.key]}
                key={node.key}
                onDragStart={() => onDragStart(node)}
              >
                {node.title as string}
              </div>
            )}
            treeData={inputTree}
            onRightClick={(info) => createContextMenuItems(info, childData)}
            onSelect={(key, info) => onSelect(info.node)}
          />
        </Dropdown>
      </div>
    </div>
  );
}
