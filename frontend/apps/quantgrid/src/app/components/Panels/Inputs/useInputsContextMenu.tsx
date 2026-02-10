import { MenuProps } from 'antd';
import { DataNode, EventDataNode } from 'antd/es/tree';
import classNames from 'classnames';
import { useCallback, useContext, useState } from 'react';
import { toast } from 'react-toastify';

import Icon from '@ant-design/icons';
import {
  CommonMetadata,
  CopyIcon,
  csvFileExtension,
  DownloadIcon,
  EditIcon,
  filesEndpointType,
  getDropdownDivider,
  getDropdownItem,
  HistoryIcon,
  makeCopy,
  MetadataNodeType,
  modalFooterButtonClasses,
  MoveToIcon,
  primaryButtonClasses,
  publicBucket,
  RefreshIcon,
  secondaryButtonClasses,
  ShareIcon,
  TableIcon,
  TrashIcon,
} from '@frontend/common';
import { MenuInfo } from '@rc-component/menu/lib/interface';

import { ApiContext, InputsContext, ProjectContext } from '../../../context';
import {
  useApiRequests,
  useDeleteResources,
  useRequestDimTable,
} from '../../../hooks';
import {
  useAntdModalStore,
  useCreateTableFromImportModalStore,
  useImportSourceModalStore,
  useShareFilesModalStore,
  useViewImportVersionsModalStore,
} from '../../../store';
import { constructPath, encodeApiUrl } from '../../../utils';

export const importTreeKey = {
  source: 'import-source:',
  catalog: 'import-catalog:',
  column: 'import-column:',
};

const contextMenuActionKeys = {
  createTable: 'createTable',
  createTableInNewSheet: 'createTableInNewSheet',
  download: 'download',
  rename: 'rename',
  clone: 'clone',
  moveTo: 'moveTo',
  share: 'share',
  delete: 'delete',
  copyPath: 'copyPath',
  editImportSource: 'editImportSource',
  deleteImportSource: 'deleteImportSource',
  viewVersions: 'viewVersions',
  pullNewData: 'pullNewData',
  syncImportSource: 'syncImportSource',
  syncDataset: 'syncDataset',
};

export type InputChildData = {
  [keyIndex: string]: CommonMetadata;
};

type ContextMenuItemData = {
  action: string;
  entityType: 'file' | 'import-source' | 'import-catalog' | 'import-column';
  entityKey: string;
  childData?: CommonMetadata;
};

function parseContextMenuKey(key: string): ContextMenuItemData {
  return JSON.parse(key);
}

function getContextMenuKey(
  action: string,
  entityType: ContextMenuItemData['entityType'],
  entityKey: string,
  childData?: CommonMetadata,
): string {
  return JSON.stringify({
    action,
    entityType,
    entityKey,
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
  const { getInputs, getImportSources, syncAllImports } =
    useContext(InputsContext);
  const { projectBucket, projectPath, projectName, hasEditPermissions } =
    useContext(ProjectContext);
  const { open: openImport } = useImportSourceModalStore();
  const confirmModal = useAntdModalStore((s) => s.confirm);

  const { requestDimSchemaForDimFormula } = useRequestDimTable();
  const { downloadFiles, deleteImportSource } = useApiRequests();
  const { deleteResources } = useDeleteResources();
  const [items, setItems] = useState<MenuProps['items']>([]);

  const createContextMenuItems = useCallback(
    async (
      info: {
        event: React.MouseEvent<Element, MouseEvent>;
        node: EventDataNode<DataNode>;
      },
      childData: InputChildData,
    ) => {
      const key = info.node.key as string;
      const file = childData[key];

      // Determine entity type
      let entityType: ContextMenuItemData['entityType'] = 'file';
      let entityKey = key;

      if (key.startsWith(importTreeKey.source)) {
        entityType = 'import-source';
        entityKey = key.replace(importTreeKey.source, '');
      } else if (key.startsWith(importTreeKey.catalog)) {
        entityType = 'import-catalog';
        entityKey = key.replace(importTreeKey.catalog, '');
      } else if (key.startsWith(importTreeKey.column)) {
        entityType = 'import-column';
        entityKey = key.replace(importTreeKey.column, '');
      }

      const items: MenuProps['items'] = [];

      switch (entityType) {
        case 'import-source': {
          items.push(
            getDropdownItem({
              key: getContextMenuKey(
                contextMenuActionKeys.editImportSource,
                entityType,
                entityKey,
              ),
              label: 'Edit source',
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() => <EditIcon />}
                />
              ),
            }),
            getDropdownItem({
              key: getContextMenuKey(
                contextMenuActionKeys.syncImportSource,
                entityType,
                entityKey,
              ),
              label: 'Sync source',
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() => <RefreshIcon />}
                />
              ),
            }),
            getDropdownItem({
              key: getContextMenuKey(
                contextMenuActionKeys.deleteImportSource,
                entityType,
                entityKey,
              ),
              label: 'Delete source',
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() => <TrashIcon />}
                />
              ),
            }),
          );
          break;
        }

        case 'import-catalog': {
          items.push(
            getDropdownItem({
              key: getContextMenuKey(
                contextMenuActionKeys.createTable,
                entityType,
                entityKey,
              ),
              label: 'Create table',
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() => <TableIcon />}
                />
              ),
            }),
            getDropdownItem({
              key: getContextMenuKey(
                contextMenuActionKeys.syncDataset,
                entityType,
                entityKey,
              ),
              label: 'Sync dataset',
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() => <RefreshIcon />}
                />
              ),
            }),
            getDropdownItem({
              key: getContextMenuKey(
                contextMenuActionKeys.pullNewData,
                entityType,
                entityKey,
              ),
              label: 'Pull new data',
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() => <DownloadIcon />}
                />
              ),
            }),
            getDropdownItem({
              key: getContextMenuKey(
                contextMenuActionKeys.viewVersions,
                entityType,
                entityKey,
              ),
              label: 'View versions',
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() => <HistoryIcon />}
                />
              ),
            }),
          );
          break;
        }

        case 'file': {
          if (!file) {
            setItems([]);

            return;
          }

          const isFolder = file.nodeType === MetadataNodeType.FOLDER;
          const isAbleToEdit =
            file.bucket === userBucket ||
            (file.bucket === publicBucket && isAdmin);
          const isAbleToShare = file.bucket === userBucket;
          const isAbleToDelete = isAbleToEdit || hasEditPermissions;

          items.push(
            getDropdownItem({
              key: getContextMenuKey(
                contextMenuActionKeys.createTable,
                entityType,
                entityKey,
                file,
              ),
              label: 'Create table',
            }),
            getDropdownItem({
              key: getContextMenuKey(
                contextMenuActionKeys.createTableInNewSheet,
                entityType,
                entityKey,
                file,
              ),
              label: 'Create table in new sheet',
            }),
            getDropdownDivider(),
          );

          if (!isFolder) {
            items.push(
              getDropdownItem({
                key: getContextMenuKey(
                  contextMenuActionKeys.download,
                  entityType,
                  entityKey,
                  file,
                ),
                label: 'Download',
                icon: (
                  <Icon
                    className="text-text-secondary w-[18px]"
                    component={() => <DownloadIcon />}
                  />
                ),
              }),
            );
          }

          if (!isFolder && isAbleToEdit) {
            items.push(
              getDropdownItem({
                key: getContextMenuKey(
                  contextMenuActionKeys.rename,
                  entityType,
                  entityKey,
                  file,
                ),
                label: 'Rename',
                icon: (
                  <Icon
                    className="text-text-secondary w-[18px]"
                    component={() => <EditIcon />}
                  />
                ),
              }),
              getDropdownItem({
                key: getContextMenuKey(
                  contextMenuActionKeys.clone,
                  entityType,
                  entityKey,
                  file,
                ),
                label: 'Clone',
                icon: (
                  <Icon
                    className="text-text-secondary w-[18px]"
                    component={() => <CopyIcon />}
                  />
                ),
              }),
            );
          }

          if (isAbleToEdit) {
            items.push(
              getDropdownItem({
                key: getContextMenuKey(
                  contextMenuActionKeys.moveTo,
                  entityType,
                  entityKey,
                  file,
                ),
                label: 'Move to',
                icon: (
                  <Icon
                    className="text-text-secondary w-[18px]"
                    component={() => <MoveToIcon />}
                  />
                ),
              }),
            );
          }

          if (isAbleToShare) {
            items.push(
              getDropdownItem({
                key: getContextMenuKey(
                  contextMenuActionKeys.share,
                  entityType,
                  entityKey,
                  file,
                ),
                label: 'Share',
                icon: (
                  <Icon
                    className="text-text-secondary w-[18px]"
                    component={() => <ShareIcon />}
                  />
                ),
              }),
            );
          }

          if (isAbleToDelete) {
            items.push(
              getDropdownItem({
                key: getContextMenuKey(
                  contextMenuActionKeys.delete,
                  entityType,
                  entityKey,
                  file,
                ),
                label: 'Delete',
                icon: (
                  <Icon
                    className="text-text-secondary w-[18px]"
                    component={() => <TrashIcon />}
                  />
                ),
              }),
            );
          }

          if (!isFolder) {
            items.push(
              getDropdownItem({
                key: getContextMenuKey(
                  contextMenuActionKeys.copyPath,
                  entityType,
                  entityKey,
                  file,
                ),
                label: 'Copy path',
                icon: (
                  <Icon
                    className="text-text-secondary w-[18px]"
                    component={() => <CopyIcon />}
                  />
                ),
              }),
            );
          }
          break;
        }

        default:
          break;
      }

      setItems(items.filter(Boolean) as MenuProps['items']);
    },
    [hasEditPermissions, isAdmin, userBucket],
  );

  const onContextMenuClick = useCallback(
    async (info: MenuInfo) => {
      const {
        action,
        entityType,
        entityKey,
        childData: file,
      } = parseContextMenuKey(info.key);

      switch (action) {
        case contextMenuActionKeys.createTable:
        case contextMenuActionKeys.createTableInNewSheet: {
          if (entityType === 'file' && file) {
            const createInNewSheet =
              action === contextMenuActionKeys.createTableInNewSheet;
            const formula = `:INPUT("${file.url}")`;
            const newTableName = file.name.replaceAll(csvFileExtension, '');
            requestDimSchemaForDimFormula({
              col: 0,
              row: 0,
              value: formula,
              newTableName,
              createInNewSheet,
            });
          } else if (entityType === 'import-catalog') {
            const [sourceKey, datasetKey, sourceName] = entityKey.split(':');
            useCreateTableFromImportModalStore
              .getState()
              .open(sourceKey, datasetKey, sourceName);
          }
          break;
        }

        case contextMenuActionKeys.download: {
          if (entityType === 'file' && file) {
            const toastId = toast.loading(`Downloading file '${file.name}'...`);
            const result = await downloadFiles({
              files: [
                {
                  bucket: file.bucket,
                  name: file.name,
                  parentPath: file.parentPath,
                },
              ],
            });
            toast.dismiss(toastId);
            if (!result) {
              toast.error('Error happened during downloading file');
            }
          }
          break;
        }

        case contextMenuActionKeys.delete: {
          if (entityType === 'file' && file) {
            deleteResources([file], () => {
              getInputs();
            });
          }
          break;
        }

        case contextMenuActionKeys.moveTo: {
          if (entityType === 'file' && file) {
            onMove(file);
          }
          break;
        }

        case contextMenuActionKeys.rename: {
          if (entityType === 'file' && file) {
            onRename(file);
          }
          break;
        }

        case contextMenuActionKeys.clone: {
          if (entityType === 'file' && file) {
            onClone(file);
          }
          break;
        }

        case contextMenuActionKeys.share: {
          if (entityType === 'file' && file) {
            useShareFilesModalStore.getState().open([file]);
          }
          break;
        }

        case contextMenuActionKeys.copyPath: {
          if (entityType === 'file' && file) {
            makeCopy(file.url);
            toast.info('Input path copied to clipboard');
          }
          break;
        }

        case contextMenuActionKeys.editImportSource: {
          if (entityType === 'import-source') {
            const [sourceKey] = entityKey.split(':');
            await openImport({ source: sourceKey });

            getImportSources();
          }
          break;
        }

        case contextMenuActionKeys.deleteImportSource: {
          if (entityType === 'import-source') {
            const [sourceKey] = entityKey.split(':');

            confirmModal({
              icon: null,
              title: 'Confirm',
              content: `Are you sure you want to delete this source?`,
              okButtonProps: {
                className: classNames(
                  modalFooterButtonClasses,
                  primaryButtonClasses,
                ),
              },
              cancelButtonProps: {
                className: classNames(
                  modalFooterButtonClasses,
                  secondaryButtonClasses,
                ),
              },
              onOk: async () => {
                await deleteImportSource({
                  project: encodeApiUrl(
                    constructPath([
                      filesEndpointType,
                      projectBucket,
                      projectPath,
                      projectName,
                    ]),
                  ),
                  source: sourceKey,
                });
                getImportSources();
              },
            });
          }
          break;
        }

        case contextMenuActionKeys.pullNewData: {
          if (entityType === 'import-catalog') {
            const [sourceKey, datasetKey, sourceName] = entityKey.split(':');
            useCreateTableFromImportModalStore
              .getState()
              .open(
                sourceKey,
                datasetKey,
                sourceName,
                undefined,
                undefined,
                'pullData',
              );
          }

          break;
        }

        case contextMenuActionKeys.viewVersions: {
          if (entityType === 'import-catalog') {
            const [sourceKey, datasetKey] = entityKey.split(':');
            useViewImportVersionsModalStore
              .getState()
              .open(sourceKey, datasetKey);
          }
          break;
        }

        case contextMenuActionKeys.syncImportSource: {
          if (entityType === 'import-source') {
            const [sourceKey] = entityKey.split(':');
            syncAllImports({ source: sourceKey });
          }
          break;
        }

        case contextMenuActionKeys.syncDataset: {
          if (entityType === 'import-catalog') {
            const [sourceKey, datasetKey] = entityKey.split(':');
            syncAllImports({ source: sourceKey, dataset: datasetKey });
          }
          break;
        }

        default:
          break;
      }
    },
    [
      requestDimSchemaForDimFormula,
      downloadFiles,
      deleteResources,
      getInputs,
      onMove,
      onRename,
      onClone,
      openImport,
      getImportSources,
      confirmModal,
      deleteImportSource,
      projectBucket,
      projectPath,
      projectName,
      syncAllImports,
    ],
  );

  return { items, onContextMenuClick, createContextMenuItems };
};
