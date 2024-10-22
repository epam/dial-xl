import { Dropdown, Tree } from 'antd';
import { Key } from 'antd/es/table/interface';
import type { DataNode, EventDataNode } from 'antd/es/tree';
import { TreeProps } from 'antd/es/tree/Tree';
import classNames from 'classnames';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import Icon from '@ant-design/icons';
import {
  ColumnsIcon,
  DownOutlinedIcon,
  FileIcon,
  projectTreeId,
  QGLogo,
  TableIcon,
} from '@frontend/common';
import { dynamicFieldName } from '@frontend/parser';

import { AppContext, ProjectContext } from '../../../context';
import { useManualEditDSL } from '../../../hooks';
import { ProjectTreeRenameModal } from './ProjectTreeRenameModal';
import {
  ProjectTreeChildData,
  useProjectTreeContextMenu,
} from './useProjectTreeContextMenu';

export const defaultRootKey = '0-0';

type RenameItemCallback = (data: ProjectTreeChildData[string]) => void;

export function ProjectTree() {
  const { isPointClickMode } = useContext(AppContext);
  const {
    projectName,
    parsedSheets,
    projectSheets,
    sheetName,
    parsedSheet,
    tablesDiffData,
  } = useContext(ProjectContext);
  const { renameTable, renameField } = useManualEditDSL();

  const onRenameTableRef = useRef<RenameItemCallback>();
  const onRenameFieldRef = useRef<RenameItemCallback>();

  const { items, onContextMenuClick, createContextMenuItems, moveToNode } =
    useProjectTreeContextMenu(onRenameTableRef, onRenameFieldRef);

  const [projectTreeData, setProjectTreeData] = useState<DataNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<TreeProps['selectedKeys']>(
    []
  );
  const [childData, setChildData] = useState<ProjectTreeChildData>({});
  const expandedSheets = useRef<Set<string>>(new Set());
  const expandedTables = useRef<Set<string>>(new Set());
  const [renamingLeafData, setRenamingLeafData] = useState<
    ProjectTreeChildData[string] | undefined
  >(undefined);

  const onShowRenameModal = useCallback(
    (data: ProjectTreeChildData[string]) => {
      setRenamingLeafData(data);
    },
    []
  );

  useEffect(() => {
    onRenameTableRef.current = onShowRenameModal;
    onRenameFieldRef.current = onShowRenameModal;
  });

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
        icon: (
          <Icon
            className="stroke-textSecondary"
            component={() => <FileIcon />}
          />
        ),
        children: sortedTables.map((t, tableIndex) => {
          // Child data to comfortable access needed information for navigation to table
          childData[`0-0-${index}-${tableIndex}`] = {
            tableName: t.tableName,
            sheetName: name,
          };
          const tableDiff = tablesDiffData[t.tableName];
          const isTableDiff =
            tableDiff.table ||
            tableDiff.fields.length ||
            tableDiff.overrides?.length;

          const key = `0-0-${index}-${tableIndex}`;
          if (expandedTables.current.has(t.tableName)) {
            tablesToExpand.push(key);
          }

          return {
            key,
            title: t.tableName,
            className: classNames(
              isPointClickMode && 'point-click',
              isTableDiff && 'text-textAccentTertiary font-semibold'
            ),
            icon: (
              <Icon
                className="stroke-textSecondary"
                component={() => <TableIcon />}
              />
            ),
            children: t.fields
              .filter((f) => f.key.fieldName !== dynamicFieldName)
              .map((f, fieldIndex) => {
                // Child data to comfortable access needed information for navigation to field
                childData[`0-0-${index}-${tableIndex}-${fieldIndex}`] = {
                  tableName: t.tableName,
                  sheetName: name,
                  fieldName: f.key.fieldName,
                };
                const isFieldDiff = tableDiff.fields.includes(f.key.fieldName);
                const isOverrideDiff = !!tableDiff.overrides?.some(
                  (override) =>
                    Object.keys(override).includes(f.key.fieldName) && !f.isKey
                );

                return {
                  title: f.key.fieldName,
                  key: `0-0-${index}-${tableIndex}-${fieldIndex}`,
                  className: classNames(
                    isPointClickMode && 'point-click',
                    (isFieldDiff || isOverrideDiff) &&
                      'text-textAccentTertiary font-semibold'
                  ),
                  icon: (
                    <Icon
                      className="stroke-textSecondary"
                      component={() => <ColumnsIcon />}
                    />
                  ),
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
        icon: (
          <Icon
            className="stroke-transparent w-[18px]"
            component={() => <QGLogo />}
          />
        ),
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
    isPointClickMode,
    parsedSheet,
    projectName,
    projectSheets,
    parsedSheets,
    sheetName,
    expandedSheets,
    expandedTables,
    tablesDiffData,
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

  const onSaveName = useCallback(
    (newName: string) => {
      if (!renamingLeafData?.tableName) return;

      setRenamingLeafData(undefined);

      if (renamingLeafData?.fieldName) {
        renameField(
          renamingLeafData.tableName,
          renamingLeafData.fieldName,
          newName
        );

        return;
      }

      renameTable(renamingLeafData.tableName, newName);
    },
    [
      renameField,
      renameTable,
      renamingLeafData?.fieldName,
      renamingLeafData?.tableName,
    ]
  );

  const onCancelEditing = useCallback(() => {
    setRenamingLeafData(undefined);
  }, []);

  if (!projectName) {
    return <span className="w-full text-center pt-3">No opened project</span>;
  }

  return (
    <div
      className="overflow-auto thin-scrollbar w-full h-full bg-bgLayer3"
      id={projectTreeId}
    >
      <div className="min-w-[200px] px-2 pt-2 relative">
        <Dropdown
          menu={{ items, onClick: onContextMenuClick }}
          trigger={['contextMenu']}
        >
          <div>
            <Tree.DirectoryTree
              className="bg-bgLayer3 text-textPrimary"
              expandAction={false}
              expandedKeys={expandedKeys}
              multiple={false}
              selectedKeys={selectedKeys}
              switcherIcon={
                <Icon
                  className="fill-textSecondary text-textSecondary pointer-events-none"
                  component={() => <DownOutlinedIcon />}
                />
              }
              treeData={projectTreeData}
              onExpand={onExpand}
              onRightClick={(info) => createContextMenuItems(info, childData)}
              onSelect={(_, info) => onSelect(info.node)}
            />
          </div>
        </Dropdown>

        <ProjectTreeRenameModal
          isOpened={!!renamingLeafData}
          modalTitle={
            renamingLeafData?.fieldName ? 'Rename field' : 'Rename table'
          }
          oldName={
            renamingLeafData?.fieldName ?? renamingLeafData?.tableName ?? ''
          }
          onCancel={onCancelEditing}
          onRename={onSaveName}
        />
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
