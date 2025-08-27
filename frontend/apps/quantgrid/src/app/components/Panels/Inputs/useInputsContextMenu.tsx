import { MenuProps } from 'antd';
import { DataNode, EventDataNode } from 'antd/es/tree';
import { MenuInfo } from 'rc-menu/lib/interface';
import { useCallback, useContext, useState } from 'react';
import { toast } from 'react-toastify';

import Icon from '@ant-design/icons';
import {
  CopyIcon,
  DownloadIcon,
  EditIcon,
  FilesMetadata,
  getDropdownDivider,
  getDropdownItem,
  MetadataNodeType,
  MoveToIcon,
  publicBucket,
  ShareIcon,
  TrashIcon,
} from '@frontend/common';

import { ApiContext, InputsContext, ProjectContext } from '../../../context';
import {
  useApiRequests,
  useCloneResources,
  useDeleteResources,
  useRequestDimTable,
} from '../../../hooks';

const contextMenuActionKeys = {
  createTable: 'createTable',
  download: 'download',
  rename: 'rename',
  clone: 'clone',
  moveTo: 'moveTo',
  share: 'share',
  delete: 'delete',
};

export type InputChildData = {
  [keyIndex: string]: FilesMetadata;
};

function parseContextMenuKey(key: string): {
  action: string;
  childData: FilesMetadata;
} {
  return JSON.parse(key);
}

function getContextMenuKey(action: string, childData: FilesMetadata): string {
  return JSON.stringify({
    action,
    childData,
  });
}

export const useInputsContextMenu = ({
  onRename,
  onMove,
}: {
  onRename: (item: FilesMetadata) => void;
  onMove: (item: FilesMetadata) => void;
}) => {
  const { userBucket, isAdmin } = useContext(ApiContext);
  const { getInputs } = useContext(InputsContext);
  const { shareResources, hasEditPermissions } = useContext(ProjectContext);

  const { requestDimSchemaForDimFormula } = useRequestDimTable();
  const { downloadFiles } = useApiRequests();
  const { deleteResources } = useDeleteResources();
  const { cloneResources } = useCloneResources();
  const [items, setItems] = useState<MenuProps['items']>([]);

  const createContextMenuItems = useCallback(
    async (
      info: {
        event: React.MouseEvent<Element, MouseEvent>;
        node: EventDataNode<DataNode>;
      },
      childData: InputChildData
    ) => {
      const key = info.node.key as string;
      const file = childData[key];
      const isFolder = file?.nodeType === MetadataNodeType.FOLDER;
      const isAbleToEdit =
        file?.bucket === userBucket ||
        (file?.bucket === publicBucket && isAdmin);
      const isAbleToShare = file?.bucket === userBucket;
      const isAbleToDelete = isAbleToEdit || hasEditPermissions;

      if (!file) {
        setItems([]);

        return;
      }

      const items: MenuProps['items'] = [
        getDropdownItem({
          key: getContextMenuKey(contextMenuActionKeys.createTable, file),
          label: 'Create table',
        }),
        getDropdownDivider(),
        !isFolder
          ? getDropdownItem({
              key: getContextMenuKey(contextMenuActionKeys.download, file),
              label: 'Download',
              icon: (
                <Icon
                  className="text-textSecondary w-[18px]"
                  component={() => <DownloadIcon />}
                />
              ),
            })
          : undefined,
        !isFolder && isAbleToEdit
          ? getDropdownItem({
              key: getContextMenuKey(contextMenuActionKeys.rename, file),
              label: 'Rename',
              icon: (
                <Icon
                  className="text-textSecondary w-[18px]"
                  component={() => <EditIcon />}
                />
              ),
            })
          : undefined,
        !isFolder && isAbleToEdit
          ? getDropdownItem({
              key: getContextMenuKey(contextMenuActionKeys.clone, file),
              label: 'Clone',
              icon: (
                <Icon
                  className="text-textSecondary w-[18px]"
                  component={() => <CopyIcon />}
                />
              ),
            })
          : undefined,
        isAbleToEdit
          ? getDropdownItem({
              key: getContextMenuKey(contextMenuActionKeys.moveTo, file),
              label: 'Move to',
              icon: (
                <Icon
                  className="text-textSecondary w-[18px]"
                  component={() => <MoveToIcon />}
                />
              ),
            })
          : undefined,
        isAbleToShare
          ? getDropdownItem({
              key: getContextMenuKey(contextMenuActionKeys.share, file),
              label: 'Share',
              icon: (
                <Icon
                  className="text-textSecondary w-[18px]"
                  component={() => <ShareIcon />}
                />
              ),
            })
          : undefined,
        isAbleToDelete
          ? getDropdownItem({
              key: getContextMenuKey(contextMenuActionKeys.delete, file),
              label: 'Delete',
              icon: (
                <Icon
                  className="text-textSecondary w-[18px]"
                  component={() => <TrashIcon />}
                />
              ),
            })
          : undefined,
      ].filter(Boolean) as MenuProps['items'];

      setItems(items);
    },
    [hasEditPermissions, isAdmin, userBucket]
  );

  const onContextMenuClick = useCallback(
    async (info: MenuInfo) => {
      const { action, childData: file } = parseContextMenuKey(info.key);

      if (!file) return;

      switch (action) {
        case contextMenuActionKeys.createTable: {
          const formula = `:INPUT("${file.url}")`;
          requestDimSchemaForDimFormula(0, 0, formula);

          break;
        }
        case contextMenuActionKeys.download: {
          toast.loading(`Downloading file '${file.name}'...`);
          const result = await downloadFiles({
            files: [
              {
                bucket: file.bucket,
                name: file.name,
                path: file.parentPath,
              },
            ],
          });
          toast.dismiss();
          if (!result) {
            toast.error('Error happened during downloading file');
          }
          break;
        }
        case contextMenuActionKeys.delete: {
          deleteResources([file], () => {
            getInputs();
          });

          break;
        }
        case contextMenuActionKeys.moveTo: {
          onMove(file);

          break;
        }
        case contextMenuActionKeys.rename: {
          onRename(file);

          break;
        }
        case contextMenuActionKeys.clone: {
          await cloneResources({ items: [file] });
          getInputs();

          break;
        }
        case contextMenuActionKeys.share: {
          shareResources([file]);

          break;
        }
        default:
          break;
      }
    },
    [
      cloneResources,
      requestDimSchemaForDimFormula,
      deleteResources,
      downloadFiles,
      getInputs,
      onMove,
      onRename,
      shareResources,
    ]
  );

  return { items, onContextMenuClick, createContextMenuItems };
};
