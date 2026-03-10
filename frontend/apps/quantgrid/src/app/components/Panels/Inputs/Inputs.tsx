import { Dropdown, Spin, Tree } from 'antd';
import { useCallback, useContext, useState } from 'react';

import Icon from '@ant-design/icons';
import {
  CommonMetadata,
  DownOutlinedIcon,
  FileIcon,
  MetadataNodeType,
} from '@frontend/common';

import { InputsContext, ViewportContext } from '../../../context';
import { useMoveResources } from '../../../hooks';
import { constructPath } from '../../../utils';
import { CloneFile, RenameFileModal, SelectFolder } from '../../Modals';
import { PanelEmptyMessage } from '../PanelEmptyMessage';
import { InputTreeNode } from './Components';
import {
  useInputsContextMenu,
  useInputsDragDrop,
  useInputsExpand,
  useInputsModals,
  useInputsTree,
} from './hooks';

export function Inputs() {
  const {
    inputList,
    isInputsLoading,
    updateInputsFolder,
    getInputs,
    importSources,
    isImportSourcesLoading,
  } = useContext(InputsContext);
  const { viewGridData } = useContext(ViewportContext);

  const { moveResources } = useMoveResources();

  const [hoverKey, setHoverKey] = useState('');

  const {
    renameItem,
    moveItem,
    cloneItem,
    onRename,
    onMove,
    onClone,
    closeRenameModal,
    closeMoveModal,
    closeCloneModal,
  } = useInputsModals();

  const { inputTree, childData } = useInputsTree();

  const { createContextMenuItems, items, onContextMenuClick } =
    useInputsContextMenu({
      onRename,
      onMove,
      onClone,
    });

  const { onDragStart } = useInputsDragDrop(childData);
  const { onExpand } = useInputsExpand({
    childData,
  });

  const onOpenFolder = useCallback(
    (folder: CommonMetadata) => {
      updateInputsFolder({
        bucket: folder.bucket,
        parentPath: constructPath([folder.parentPath, folder.name]),
      });
    },
    [updateInputsFolder],
  );

  const handleMoveToFolder = useCallback(
    async (bucket: string, path: string | null | undefined) => {
      if (!moveItem) return;

      await moveResources([moveItem], path, bucket, () => {
        viewGridData.clearCachedViewports();

        getInputs();
      });

      closeMoveModal();
    },
    [moveItem, moveResources, viewGridData, getInputs, closeMoveModal],
  );

  const handleDoubleClick = useCallback(
    (key: string) => {
      const data = childData[key];

      if (data?.nodeType === MetadataNodeType.FOLDER) {
        onOpenFolder(data);
      }
    },
    [childData, onOpenFolder],
  );

  return (
    <div className="overflow-auto thin-scrollbar w-full h-full bg-bg-layer-3 flex flex-col">
      {isInputsLoading || isImportSourcesLoading ? (
        <div className="flex grow items-center justify-center">
          <Spin className="z-50" size="large"></Spin>
        </div>
      ) : (!inputList || inputList.length === 0) &&
        Object.keys(importSources).length === 0 ? (
        <PanelEmptyMessage icon={<FileIcon />} message="No inputs" />
      ) : (
        <div className="min-w-[200px] pr-2 pt-2 relative">
          <Dropdown
            menu={{ items, onClick: onContextMenuClick }}
            trigger={['contextMenu']}
          >
            <div>
              <Tree.DirectoryTree
                className="bg-bg-layer-3 text-text-primary"
                defaultExpandAll={false}
                draggable={false}
                icon={false}
                loadData={onExpand}
                multiple={false}
                selectable={false}
                switcherIcon={
                  <Icon
                    className="text-text-secondary w-2"
                    component={() => <DownOutlinedIcon />}
                  />
                }
                titleRender={(node) => (
                  <InputTreeNode
                    childData={childData}
                    hoverKey={hoverKey}
                    node={node}
                    onDoubleClick={handleDoubleClick}
                    onDragStart={onDragStart}
                  />
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
                closeRenameModal();
                getInputs();
              }}
            />
          )}
          {moveItem && (
            <SelectFolder
              initialBucket={moveItem.bucket}
              initialPath={moveItem.parentPath}
              onCancel={closeMoveModal}
              onOk={handleMoveToFolder}
            />
          )}
          {cloneItem && (
            <CloneFile
              item={cloneItem}
              onModalClose={() => {
                closeCloneModal();
                getInputs();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
