import { MenuProps } from 'antd';
import { DataNode, EventDataNode } from 'antd/es/tree';
import { MenuInfo } from 'rc-menu/lib/interface';
import { useCallback, useContext, useState } from 'react';
import { toast } from 'react-toastify';

import Icon from '@ant-design/icons';
import {
  CommonMetadata,
  CopyIcon,
  csvFileExtension,
  DownloadIcon,
  EditIcon,
  getDropdownDivider,
  getDropdownItem,
  makeCopy,
  MetadataNodeType,
  MoveToIcon,
  publicBucket,
  ShareIcon,
  TrashIcon,
} from '@frontend/common';

import { ApiContext, InputsContext, ProjectContext } from '../../../context';
import {
  useApiRequests,
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
  copyPath: 'copyPath',
};

export type InputChildData = {
  [keyIndex: string]: CommonMetadata;
};

function parseContextMenuKey(key: string): {
  action: string;
  childData: CommonMetadata;
} {
  return JSON.parse(key);
}

function getContextMenuKey(action: string, childData: CommonMetadata): string {
  return JSON.stringify({
    action,
    childData,
  });
}

export const useInputsContextMenu = ({
  onRename,
  onMove,
  onClone,
}: {
  onRename: (item: CommonMetadata) => void;
  onMove: (item: CommonMetadata) => void;
  onClone: (item: CommonMetadata) => void;
}) => {
  const { userBucket, isAdmin } = useContext(ApiContext);
  const { getInputs } = useContext(InputsContext);
  const { shareResources, hasEditPermissions } = useContext(ProjectContext);

  const { requestDimSchemaForDimFormula } = useRequestDimTable();
  const { downloadFiles } = useApiRequests();
  const { deleteResources } = useDeleteResources();
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
                  className="text-text-secondary w-[18px]"
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
                  className="text-text-secondary w-[18px]"
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
                  className="text-text-secondary w-[18px]"
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
                  className="text-text-secondary w-[18px]"
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
                  className="text-text-secondary w-[18px]"
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
                  className="text-text-secondary w-[18px]"
                  component={() => <TrashIcon />}
                />
              ),
            })
          : undefined,
        !isFolder
          ? getDropdownItem({
              key: getContextMenuKey(contextMenuActionKeys.copyPath, file),
              label: 'Copy path',
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() => <CopyIcon />}
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
          const tableName = file.name.replaceAll(csvFileExtension, '');
          requestDimSchemaForDimFormula(0, 0, formula, tableName);

          break;
        }
        case contextMenuActionKeys.download: {
          toast.loading(`Downloading file '${file.name}'...`);
          const result = await downloadFiles({
            files: [
              {
                bucket: file.bucket,
                name: file.name,
                parentPath: file.parentPath,
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
          onClone(file);

          break;
        }
        case contextMenuActionKeys.share: {
          shareResources([file]);

          break;
        }
        case contextMenuActionKeys.copyPath: {
          makeCopy(file.url);
          toast.info('Input path copied to clipboard');
          break;
        }
        default:
          break;
      }
    },
    [
      requestDimSchemaForDimFormula,
      deleteResources,
      downloadFiles,
      getInputs,
      onMove,
      onRename,
      onClone,
      shareResources,
    ]
  );

  return { items, onContextMenuClick, createContextMenuItems };
};
