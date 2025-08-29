import { Dropdown, Tree } from 'antd';
import { Key } from 'antd/es/table/interface';
import type { DataNode, EventDataNode } from 'antd/es/tree';
import { TreeProps } from 'antd/es/tree/Tree';
import classNames from 'classnames';
import cx from 'classnames';
import {
  ComponentRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import Icon from '@ant-design/icons';
import {
  ColumnsAIIcon,
  ColumnsIcon,
  DownOutlinedIcon,
  DragIcon,
  FileIcon,
  Highlight,
  projectTreeId,
  TableAIIcon,
  TableIcon,
} from '@frontend/common';
import {
  dynamicFieldName,
  unescapeFieldName,
  unescapeTableName,
} from '@frontend/parser';

import {
  AppContext,
  ChatOverlayContext,
  ProjectContext,
} from '../../../context';
import { useRenameFieldDsl, useTableEditDsl } from '../../../hooks';
import { ProjectTreeRenameModal } from './ProjectTreeRenameModal';
import {
  ProjectTreeChildData,
  useProjectTreeContextMenu,
} from './useProjectTreeContextMenu';
import { useTreeHeight } from './useTreeHeight';

type RenameItemCallback = (data: ProjectTreeChildData[string]) => void;
const tableSelectedNodeClass = 'tree-parent-selected';

export function ProjectTree() {
  const { isPointClickMode } = useContext(AppContext);
  const {
    projectName,
    parsedSheets,
    projectSheets,
    sheetName,
    parsedSheet,
    diffData,
    selectedCell,
  } = useContext(ProjectContext);
  const { isAIPendingChanges, isAIPreview } = useContext(ChatOverlayContext);
  const { renameTable, moveTableToSheet } = useTableEditDsl();
  const { renameField } = useRenameFieldDsl();

  const height = useTreeHeight();

  const treeRef = useRef<ComponentRef<typeof Tree>>(null);
  const prevParentRef = useRef<HTMLElement | null>(null);
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
    const diffSheets = Object.entries(parsedSheets).reduce(
      (acc, [key, value]) => {
        const isPresented =
          !diffData ||
          diffData?.defaultHighlight !== Highlight.DIMMED ||
          value.tables.some(
            (table) => !!diffData.data[unescapeTableName(table.tableName)]
          );

        acc[key] = isPresented;

        return acc;
      },
      {} as Record<string, boolean>
    );

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

      const isViewChanges = isAIPreview || isAIPendingChanges;

      return {
        key,
        title: (
          <span
            className={classNames(
              'truncate flex justify-between group items-center',
              sheetName === name && '!text-textAccentPrimary',
              {
                'text-textSecondary opacity-50': !diffSheets[name],
              }
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
          const tableDiff = diffData?.data[unescapeTableName(t.tableName)];
          const tableHighlight =
            tableDiff?.tableHighlight ?? diffData?.defaultHighlight;

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
                  {
                    'text-textAccentTertiary': tableHighlight === 'HIGHLIGHTED',
                    'text-textSecondary opacity-50':
                      tableHighlight === 'DIMMED',
                  }
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
            className: classNames(isPointClickMode && 'point-click'),
            icon: (
              <Icon
                className={cx('text-textSecondary w-[18px]', {
                  'opacity-50': tableHighlight === 'DIMMED',
                })}
                component={() =>
                  isViewChanges && tableHighlight !== 'DIMMED' ? (
                    <TableAIIcon />
                  ) : (
                    <TableIcon />
                  )
                }
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
                const fieldHighlight =
                  tableDiff?.fieldsHighlight?.find(
                    (item) =>
                      item.fieldName === unescapeFieldName(f.key.fieldName)
                  )?.highlight ?? diffData?.defaultHighlight;

                const key = `0-0-${index}-${tableIndex}-${fieldIndex}`;

                return {
                  key,
                  title: (
                    <span
                      className={classNames(
                        'truncate flex justify-between group items-center',
                        {
                          'text-textSecondary opacity-50':
                            fieldHighlight === 'DIMMED',
                        }
                      )}
                      id={key}
                      title={f.key.fieldName}
                    >
                      <span className="truncate">{f.key.fieldName}</span>
                    </span>
                  ),
                  className: classNames(isPointClickMode && 'point-click'),
                  icon: (
                    <Icon
                      className={cx('size-[18px]', {
                        'text-textAccentTertiary':
                          fieldHighlight === 'HIGHLIGHTED',
                        'text-textSecondary opacity-50':
                          fieldHighlight === 'DIMMED',
                      })}
                      component={() =>
                        isViewChanges && fieldHighlight !== 'DIMMED' ? (
                          <ColumnsAIIcon />
                        ) : (
                          <ColumnsIcon />
                        )
                      }
                    />
                  ),
                  isLeaf: true,
                };
              }),
          } as DataNode;
        }),
      };
    });

    setProjectTreeData([...children]);

    const expKeys = [openedSheetIndex, ...tablesToExpand, ...sheetsToExpand];
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
    diffData,
    isAIPendingChanges,
    isAIPreview,
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

  useEffect(() => {
    const sheetsToExpand: string[] = [];
    const tablesToExpand: string[] = [];

    projectTreeData.forEach((child) => {
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
          requestAnimationFrame(() => {
            setTimeout(() => {
              treeRef.current?.scrollTo({
                key: localSelectedKeys[0].toString(),
                align: 'auto',
              });
            }, 300);
          });
        }
        setSelectedKeys(localSelectedKeys);
      }
    });

    setExpandedKeys((prev) => [
      ...new Set([...prev, ...sheetsToExpand, ...tablesToExpand]),
    ]);
  }, [
    childData,
    projectTreeData,
    selectedCell?.fieldName,
    selectedCell?.tableName,
    sheetName,
  ]);

  useEffect(() => {
    // wait until nodes are expanded
    setTimeout(() => {
      prevParentRef.current?.classList.remove(tableSelectedNodeClass);
      prevParentRef.current = null;

      if (!selectedCell?.fieldName || !selectedCell.tableName) return;

      const parentKey = Object.keys(childData).find((key) => {
        const d = childData[key];

        return (
          d.sheetName === sheetName &&
          d.tableName === selectedCell.tableName &&
          !d.fieldName
        );
      });
      if (!parentKey) return;

      const span = document.getElementById(parentKey);
      const wrapper = span?.closest<HTMLElement>(
        '.ant-tree-node-content-wrapper'
      );
      if (!wrapper) return;

      wrapper.classList.add(tableSelectedNodeClass);
      prevParentRef.current = wrapper;
    }, 300);
  }, [
    childData,
    sheetName,
    selectedCell?.fieldName,
    selectedCell?.tableName,
    selectedKeys,
  ]);

  if (!projectName) {
    return <span className="w-full text-center pt-3">No opened project</span>;
  }

  return (
    <div
      className="overflow-auto thin-scrollbar w-full h-full bg-bgLayer3"
      id={projectTreeId}
    >
      <div className="min-w-[200px] pr-2 relative">
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
              height={height}
              motion={false}
              multiple={false}
              ref={treeRef}
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
