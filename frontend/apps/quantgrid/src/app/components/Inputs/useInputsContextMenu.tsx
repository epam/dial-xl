import { MenuProps } from 'antd';
import { DataNode, EventDataNode } from 'antd/es/tree';
import { MenuInfo } from 'rc-menu/lib/interface';
import { useCallback, useState } from 'react';

import { useRequestDimTable } from '../../hooks';

const contextMenuActionKeys = {
  createTable: 'createTable',
};

type ChildData = {
  path?: string;
};
export type InputChildData = {
  [keyIndex: string]: ChildData;
};

function parseContextMenuKey(key: string): {
  action: string;
  childData: ChildData;
} {
  return JSON.parse(key);
}

function getContextMenuKey(action: string, childData: ChildData): string {
  return JSON.stringify({
    action,
    childData,
  });
}

export const useInputsContextMenu = () => {
  const { createDimTableFromFormula } = useRequestDimTable();
  const [items, setItems] = useState<MenuProps['items']>([]);

  const createContextMenuItems = useCallback(
    (
      info: {
        event: React.MouseEvent<Element, MouseEvent>;
        node: EventDataNode<DataNode>;
      },
      childData: InputChildData
    ) => {
      const { key } = info.node;
      const menuItems: MenuProps['items'] = [];

      if (!childData[key]) {
        setItems([]);

        return;
      }

      menuItems.push({
        key: getContextMenuKey(
          contextMenuActionKeys.createTable,
          childData[key]
        ),
        label: 'Create table',
      });

      setItems(menuItems);
    },
    []
  );

  const onContextMenuClick = useCallback(
    (info: MenuInfo) => {
      const { action, childData } = parseContextMenuKey(info.key);

      switch (action) {
        case contextMenuActionKeys.createTable:
          if (childData.path) {
            const formula = `:INPUT("${childData.path}")`;
            createDimTableFromFormula(0, 0, formula);
          }
          break;
      }
    },
    [createDimTableFromFormula]
  );

  return { items, onContextMenuClick, createContextMenuItems };
};
