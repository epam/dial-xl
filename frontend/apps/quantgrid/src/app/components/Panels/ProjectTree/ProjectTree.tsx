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
  DragIcon,
  FileIcon,
  projectTreeId,
  QGLogo,
  TableIcon,
} from '@frontend/common';
import { dynamicFieldName } from '@frontend/parser';

import { AppContext, ProjectContext } from '../../../context';
import {
  useManualEditDSL,
  useRenameFieldDsl,
  useTableEditDsl,
} from '../../../hooks';
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
    selectedCell,
  } = useContext(ProjectContext);
  const { moveTableToSheet } = useManualEditDSL();
  const { renameTable } = useTableEditDsl();
  const { renameField } = useRenameFieldDsl();

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
        title: (
          <span
            className={classNames(
              'truncate flex justify-between group items-center',
              sheetName === name && '!text-textAccentPrimary'
            )}
            id={key}
            title={name}
          >
            <span className="truncate">{name}</span>
          </span>
        ),
        icon: (
          <Icon
            className="text-textSecondary w-[18px]"
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
            tableDiff?.table ||
            tableDiff?.changedFields.length ||
            tableDiff?.overrides?.length ||
            tableDiff?.deletedFields.length;

          const key = `0-0-${index}-${tableIndex}`;
          if (expandedTables.current.has(t.tableName)) {
            tablesToExpand.push(key);
          }

          return {
            key,
            title: (
              <span
                className={classNames(
                  'truncate flex justify-between group items-center',
                  selectedCell?.tableName === t.tableName &&
                    '!text-textAccentPrimary'
                )}
                id={key}
                title={t.tableName}
              >
                <span className="truncate">{t.tableName}</span>
                <div className="text-textSecondary hidden group-hover:block">
                  <Icon
                    className="w-[18px] text-textSecondary mr-1"
                    component={() => <DragIcon />}
                  />
                  Drag
                </div>
              </span>
            ),
            className: classNames(
              isPointClickMode && 'point-click',
              isTableDiff && 'text-textAccentTertiary font-semibold'
            ),
            icon: (
              <Icon
                className="text-textSecondary w-[18px]"
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
                const isFieldDiff = tableDiff?.changedFields.includes(
                  f.key.fieldName
                );
                const isOverrideDiff = !!tableDiff?.overrides?.some(
                  (override) =>
                    Object.keys(override).includes(f.key.fieldName) &&
                    !f.isKey &&
                    override[f.key.fieldName] !== '""'
                );
                const key = `0-0-${index}-${tableIndex}-${fieldIndex}`;

                return {
                  key,
                  title: (
                    <span
                      className={classNames(
                        'truncate flex justify-between group items-center',
                        selectedCell?.fieldName === f.key.fieldName &&
                          '!text-textAccentPrimary'
                      )}
                      id={key}
                      title={f.key.fieldName}
                    >
                      <span className="truncate">{f.key.fieldName}</span>
                    </span>
                  ),
                  className: classNames(
                    isPointClickMode && 'point-click',
                    (isFieldDiff || isOverrideDiff) &&
                      'text-textAccentTertiary font-semibold'
                  ),
                  icon: (
                    <Icon
                      className="size-[18px] text-textSecondary"
                      component={() => <ColumnsIcon />}
                    />
                  ),
                  isLeaf: true,
                };
              }),
          } as DataNode;
        }),
      };
    });

    children.forEach((child) => {
      const itemSheetName = childData[child.key.toString()]?.sheetName;

      if (itemSheetName === sheetName) {
        let localSelectedKeys = [child.key];
        if (!expandedSheets.current.has(child.key.toString())) {
          sheetsToExpand.push(child.key.toString());
        }

        child.children?.forEach((child) => {
          const tableName = childData[child.key.toString()].tableName;

          if (tableName === selectedCell?.tableName) {
            localSelectedKeys = [child.key];
            if (!expandedTables.current.has(child.key.toString())) {
              tablesToExpand.push(child.key.toString());
            }

            child.children?.forEach((child) => {
              const fieldName = childData[child.key.toString()].fieldName;

              if (fieldName === selectedCell?.fieldName) {
                localSelectedKeys = [child.key];
              }
            });
          }
        });

        if (localSelectedKeys[0]) {
          // We need to have timeout because there is some animation for expanding item in tree
          setTimeout(() => {
            document
              .getElementById(localSelectedKeys[0].toString())
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
        setSelectedKeys(localSelectedKeys);
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
    selectedCell?.tableName,
    selectedCell?.fieldName,
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
        nativeEvent: Event;
      }
    ) => {
      const { expanded, node, nativeEvent } = info;
      const parsedKey = node.key.toString().split('-');
      const isSheet = parsedKey.length === 3;
      const isTable = parsedKey.length === 4;
      const sheetName = childData[node.key.toString()].sheetName;
      const tableName = childData[node.key.toString()].tableName;

      if (isTable && nativeEvent instanceof DragEvent) return;

      setExpandedKeys(expandedKeys as string[]);
      if (expanded) {
        if (isSheet && sheetName) expandedSheets.current.add(sheetName);
        if (isTable && tableName) expandedTables.current.add(tableName);
      } else {
        if (isSheet && sheetName) expandedSheets.current.delete(sheetName);
        if (isTable && tableName) expandedTables.current.delete(tableName);
      }
    },
    [childData]
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

  const handleIsNodeDraggable = useCallback(
    (node: DataNode) =>
      // We need to allow dragging sheet (3 segments)
      // otherwise it's not registering events for on drop
      node.key.toString().split('-').length === 3 ||
      node.key.toString().split('-').length === 4,
    []
  );

  const handleNodeDropAllowed = useCallback(
    ({ dropNode }: { dropNode: DataNode }) => {
      return dropNode.key.toString().split('-').length === 3;
    },
    []
  );

  const handleDrop = useCallback(
    ({ node, dragNode }: { node: DataNode; dragNode: DataNode }) => {
      const tableName = childData[dragNode.key.toString()].tableName;
      const sourceSheetName = childData[dragNode.key.toString()].sheetName;
      const destinationSheetName = childData[node.key.toString()].sheetName;

      if (
        !tableName ||
        !sourceSheetName ||
        !destinationSheetName ||
        sourceSheetName === destinationSheetName
      )
        return;

      moveTableToSheet(tableName, sourceSheetName, destinationSheetName);
    },
    [childData, moveTableToSheet]
  );

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
              allowDrop={handleNodeDropAllowed}
              className="bg-bgLayer3 text-textPrimary"
              draggable={{ icon: false, nodeDraggable: handleIsNodeDraggable }}
              expandAction={false}
              expandedKeys={expandedKeys}
              multiple={false}
              selectedKeys={selectedKeys}
              switcherIcon={
                <Icon
                  className="text-textSecondary pointer-events-none w-2"
                  component={() => <DownOutlinedIcon />}
                />
              }
              treeData={projectTreeData}
              onDrop={handleDrop}
              onExpand={onExpand}
              onRightClick={(info) => createContextMenuItems(info, childData)}
              onSelect={(_, info) => onSelect(info.node)}
            />
          </div>
        </Dropdown>

        <ProjectTreeRenameModal
          isOpened={!!renamingLeafData}
          modalTitle={
            renamingLeafData?.fieldName ? 'Rename column' : 'Rename table'
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
