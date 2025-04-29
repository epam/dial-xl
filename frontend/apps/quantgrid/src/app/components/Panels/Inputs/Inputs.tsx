import { Dropdown, Spin, Tree } from 'antd';
import type { DataNode, EventDataNode } from 'antd/es/tree';
import { useCallback, useContext, useEffect, useState } from 'react';

import Icon from '@ant-design/icons';
import {
  DownOutlinedIcon,
  DragIcon,
  FilesMetadata,
  getDropdownItem,
  HomeIcon,
  publicBucket,
} from '@frontend/common';

import {
  ApiContext,
  InputsContext,
  ProjectContext,
  ViewportContext,
} from '../../../context';
import { useMoveResources } from '../../../hooks';
import { Breadcrumb } from '../../../types/breadcrumbs';
import { constructPath } from '../../../utils';
import { Breadcrumbs } from '../../Breadcrumbs/Breadcrumbs';
import { RenameFileModal, SelectFolder } from '../../Modals';
import { getNode } from './buildTree';
import { InputUpload } from './InputUpload';
import { InputChildData, useInputsContextMenu } from './useInputsContextMenu';
import { useInputsDragDrop } from './useInputsDragDrop';

export function Inputs() {
  const {
    inputList,
    inputs,
    inputsBucket,
    inputsParentPath,
    isInputsLoading,
    updateInputsFolder,
    expandFile,
    getInputs,
  } = useContext(InputsContext);
  const { projectBucket } = useContext(ProjectContext);
  const { userBucket } = useContext(ApiContext);
  const { viewGridData } = useContext(ViewportContext);

  const { moveResources } = useMoveResources();

  const [inputTree, setInputTree] = useState<DataNode[]>([]);
  const [childData, setChildData] = useState<InputChildData>({});
  const [hoverKey, setHoverKey] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [renameItem, setRenameItem] = useState<FilesMetadata>();
  const [moveItem, setMoveItem] = useState<FilesMetadata>();

  const { createContextMenuItems, items, onContextMenuClick } =
    useInputsContextMenu({
      onRename: (item: FilesMetadata) => setRenameItem(item),
      onMove: (item: FilesMetadata) => setMoveItem(item),
    });
  const { onDragStart } = useInputsDragDrop(childData);

  const onExpand = useCallback(
    async (node: EventDataNode<DataNode>) => {
      if (node.isLeaf) return;

      expandFile(childData[node.key as string]);
    },
    [childData, expandFile]
  );

  const onOpenFolder = useCallback(
    (folder: FilesMetadata) => {
      updateInputsFolder({
        bucket: folder.bucket,
        parentPath: constructPath([folder.parentPath, folder.name]),
      });
    },
    [updateInputsFolder]
  );

  const handleSelectBreadcrumb = useCallback(
    (breadcrumb: Breadcrumb) => {
      updateInputsFolder({
        parentPath: breadcrumb.path,
        bucket: breadcrumb.bucket,
      });
    },
    [updateInputsFolder]
  );

  const handleMoveToFolder = useCallback(
    async (path: string | null | undefined, bucket: string) => {
      if (!moveItem) return;

      await moveResources([moveItem], path, bucket, () => {
        viewGridData.clearCachedViewports();

        getInputs();
      });

      setMoveItem(undefined);
    },
    [moveItem, moveResources, viewGridData, getInputs]
  );

  useEffect(() => {
    if (!inputList) return;

    const tree: DataNode[] = [];
    const childData: InputChildData = {};

    inputList
      .sort((a, b) => {
        return a.nodeType === 'FOLDER' && b.nodeType === 'ITEM'
          ? -1
          : a.nodeType === 'ITEM' && b.nodeType === 'FOLDER'
          ? 1
          : a.name.localeCompare(b.name);
      })
      .forEach((input) => {
        const fields = inputs[input.url]?.fields || [];
        const key = `${input.parentPath}-${input.name}`;

        const node = getNode(input, fields, key);
        tree.push(node);
        childData[key] = input;
      });

    setInputTree(tree);
    setChildData(childData);
  }, [inputList, inputs]);

  useEffect(() => {
    if (projectBucket) {
      const breadcrumbs = (
        inputsParentPath ? inputsParentPath.split('/') : []
      ).reduce(
        (acc, curr, index) => {
          const prevBreadcrumb = acc[index];

          acc.push({
            path: [prevBreadcrumb.path, curr].filter(Boolean).join('/'),
            name: curr,
            bucket: projectBucket,
          });

          return acc;
        },
        [
          {
            name:
              inputsBucket === userBucket
                ? 'Home'
                : inputsBucket === publicBucket
                ? 'Public'
                : 'Shared with me',
            dropdownItems: [
              getDropdownItem({
                key: 'Home',
                label: 'Home',
                onClick: () =>
                  handleSelectBreadcrumb({
                    name: 'Home',
                    path: null,
                    icon: <HomeIcon />,
                    bucket: userBucket,
                  }),
              }),
              getDropdownItem({
                key: 'SharedWithMe',
                label: 'Shared with me',
                onClick: () =>
                  handleSelectBreadcrumb({
                    name: 'Home',
                    path: null,
                    icon: <HomeIcon />,
                    bucket: undefined,
                  }),
              }),
              getDropdownItem({
                key: 'Public',
                label: 'Public',
                onClick: () =>
                  handleSelectBreadcrumb({
                    name: 'Public',
                    path: null,
                    icon: <HomeIcon />,
                    bucket: publicBucket,
                  }),
              }),
            ],
            path: null,
            icon: <HomeIcon />,
            bucket: userBucket === projectBucket ? projectBucket : undefined,
          },
        ] as Breadcrumb[]
      );

      setBreadcrumbs(breadcrumbs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputsParentPath, inputsBucket]);

  return (
    <div className="overflow-auto thin-scrollbar w-full h-full bg-bgLayer3 flex flex-col">
      <InputUpload />

      {breadcrumbs.length > 0 && (
        <div className="px-1 py-2 border-b border-strokePrimary">
          <Breadcrumbs
            breadcrumbs={breadcrumbs}
            classNames="text-xs pl-2"
            onSelectBreadcrumb={handleSelectBreadcrumb}
          />
        </div>
      )}

      {isInputsLoading ? (
        <div className="flex grow items-center justify-center">
          <Spin className="z-50" size="large"></Spin>
        </div>
      ) : !inputList || inputList.length === 0 ? (
        <span className="grow w-full bg-bgLayer3 text-[13px] text-textSecondary text-center pt-3 px-2">
          No inputs
        </span>
      ) : (
        <div className="min-w-[200px] px-2 pt-2 relative">
          <Dropdown
            menu={{ items, onClick: onContextMenuClick }}
            trigger={['contextMenu']}
          >
            <div>
              <Tree.DirectoryTree
                className="bg-bgLayer3 text-textPrimary"
                defaultExpandAll={true}
                draggable={false}
                icon={false}
                loadData={onExpand}
                multiple={false}
                selectable={false}
                switcherIcon={
                  <Icon
                    className="text-textSecondary w-2"
                    component={() => <DownOutlinedIcon />}
                  />
                }
                titleRender={(node) => (
                  <div
                    className="flex w-full items-center justify-between select-none"
                    data-path={node.key}
                    draggable={
                      childData[node.key as string]?.nodeType === 'ITEM'
                    }
                    key={node.key}
                    onDoubleClick={() => {
                      const data = childData[node.key as string];

                      if (data.nodeType === 'FOLDER') {
                        onOpenFolder(data);
                      }
                    }}
                    onDragStart={(ev) => onDragStart(node, ev)}
                  >
                    <div className="inline-block overflow-hidden whitespace-nowrap text-ellipsis">
                      {node.title as string}
                    </div>
                    {hoverKey === node.key &&
                      childData[node.key]?.nodeType === 'ITEM' && (
                        <div className="flex items-center pointer-events-none">
                          <Icon
                            className="w-[18px] text-textSecondary mr-1"
                            component={() => <DragIcon />}
                          />

                          <span className="text-[13px] text-textSecondary">
                            Drag
                          </span>
                        </div>
                      )}
                  </div>
                )}
                treeData={inputTree}
                onMouseEnter={(e) => {
                  setHoverKey(e.node.key as string);
                }}
                onMouseLeave={() => {
                  setHoverKey('');
                }}
                onRightClick={(info) => createContextMenuItems(info, childData)}
              />
            </div>
          </Dropdown>

          {renameItem && (
            <RenameFileModal
              item={renameItem}
              onModalClose={() => {
                viewGridData.clearCachedViewports();
                setRenameItem(undefined);

                getInputs();
              }}
            />
          )}
          {moveItem && (
            <SelectFolder
              initialBucket={moveItem.bucket}
              initialPath={moveItem.parentPath}
              onCancel={() => setMoveItem(undefined)}
              onOk={handleMoveToFolder}
            />
          )}
        </div>
      )}
    </div>
  );
}
