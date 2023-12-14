import { Dropdown, Tree } from 'antd';
import { Key } from 'antd/es/table/interface';
import type { DataNode, EventDataNode } from 'antd/es/tree';
import { TreeProps } from 'antd/es/tree/Tree';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import {
  DatabaseOutlined,
  DownOutlined,
  FileOutlined,
  TableOutlined,
} from '@ant-design/icons';

import { ProjectContext } from '../../context';
import {
  ProjectTreeChildData,
  useProjectTreeContextMenu,
} from './useProjectTreeContextMenu';

export const defaultRootKey = '0-0';

export function ProjectTree() {
  const { projectName, parsedSheets, projectSheets, sheetName, parsedSheet } =
    useContext(ProjectContext);

  const { items, onContextMenuClick, createContextMenuItems, moveToNode } =
    useProjectTreeContextMenu();

  const [projectTreeData, setProjectTreeData] = useState<DataNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<TreeProps['selectedKeys']>(
    []
  );
  const [childData, setChildData] = useState<ProjectTreeChildData>({});
  const expandedSheets = useRef<Set<string>>(new Set());
  const expandedTables = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!projectName || !projectSheets || !sheetName) return;

    let children: DataNode[] = [];
    let openedSheetIndex = '';
    const childData: ProjectTreeChildData = {};

    const sheetsToExpand: string[] = [];
    const tablesToExpand: string[] = [];

    const sortedSheets = projectSheets.sort((a, b) => {
      return a.sheetName.localeCompare(b.sheetName);
    });

    children = sortedSheets.map((sheet, index) => {
      const name = sheet.sheetName;

      const parsedSheet =
        parsedSheets && Object.prototype.hasOwnProperty.call(parsedSheets, name)
          ? parsedSheets[name]
          : null;

      if (!parsedSheet) {
        return getEmptyLeaf(name, index);
      }

      // Child data to comfortable access needed information for navigation to sheet
      childData[`0-0-${index}`] = { sheetName: name };

      if (name === sheetName) {
        openedSheetIndex = `0-0-${index}`;
      }

      const key = `0-0-${index}`;
      const sortedTables = parsedSheet.tables.sort((a, b) => {
        return a.tableName.localeCompare(b.tableName);
      });

      if (expandedSheets.current.has(name)) {
        sheetsToExpand.push(key);
      }

      return {
        key,
        title: name,
        icon: <FileOutlined />,
        children: sortedTables.map((t, tableIndex) => {
          // Child data to comfortable access needed information for navigation to table
          childData[`0-0-${index}-${tableIndex}`] = {
            tableName: t.tableName,
            sheetName: name,
          };

          const key = `0-0-${index}-${tableIndex}`;
          if (expandedTables.current.has(t.tableName)) {
            tablesToExpand.push(key);
          }

          return {
            key,
            title: t.tableName,
            icon: <TableOutlined />,
            children: t.fields.map((f, fieldIndex) => {
              // Child data to comfortable access needed information for navigation to field
              childData[`0-0-${index}-${tableIndex}-${fieldIndex}`] = {
                tableName: t.tableName,
                sheetName: name,
                fieldName: f.key.fieldName,
              };

              return {
                title: f.key.fieldName,
                key: `0-0-${index}-${tableIndex}-${fieldIndex}`,
                icon: <DatabaseOutlined />,
                isLeaf: true,
              };
            }),
          };
        }),
      };
    });

    children.forEach((child) => {
      if (child.title === sheetName) {
        setSelectedKeys([child.key]);
      }
    });

    setProjectTreeData([
      {
        title: projectName,
        key: defaultRootKey,
        children,
      },
    ]);

    const expKeys = [
      defaultRootKey,
      openedSheetIndex,
      ...sheetsToExpand,
      ...tablesToExpand,
    ];
    expandedSheets.current.add(sheetName);

    setExpandedKeys(expKeys);

    setChildData(childData);
  }, [
    parsedSheet,
    projectName,
    projectSheets,
    parsedSheets,
    sheetName,
    expandedSheets,
    expandedTables,
  ]);

  const onSelect = useCallback(
    (node: EventDataNode<DataNode>) => {
      const data = childData[node.key as string];

      if (!data) return;

      moveToNode(data);
    },
    [childData, moveToNode]
  );

  const onExpand = useCallback(
    (
      expandedKeys: Key[],
      info: {
        node: EventDataNode<DataNode>;
        expanded: boolean;
        nativeEvent: MouseEvent;
      }
    ) => {
      setExpandedKeys(expandedKeys as string[]);

      const { expanded, node } = info;
      const title = node.title as string;
      const parsedKey = node.key.toString().split('-');
      const isSheet = parsedKey.length === 3;
      const isTable = parsedKey.length === 4;

      if (expanded) {
        if (isSheet) expandedSheets.current.add(title);
        if (isTable) expandedTables.current.add(title);
      } else {
        if (isSheet) expandedSheets.current.delete(title);
        if (isTable) expandedTables.current.delete(title);
      }
    },
    []
  );

  if (!projectName) {
    return <span className="w-full text-center pt-3">No opened project</span>;
  }

  return (
    <div className="overflow-auto w-full h-full">
      <div className="min-w-[200px] pl-3 relative">
        <Dropdown
          menu={{ items, onClick: onContextMenuClick }}
          trigger={['contextMenu']}
        >
          <Tree.DirectoryTree
            expandAction={false}
            expandedKeys={expandedKeys}
            multiple={false}
            selectedKeys={selectedKeys}
            switcherIcon={<DownOutlined />}
            treeData={projectTreeData}
            onExpand={onExpand}
            onRightClick={(info) => createContextMenuItems(info, childData)}
            onSelect={(_, info) => onSelect(info.node)}
          />
        </Dropdown>
      </div>
    </div>
  );
}

function getEmptyLeaf(name: string, index: number): DataNode {
  return {
    title: name,
    key: `0-0-${index}`,
    isLeaf: true,
  };
}
