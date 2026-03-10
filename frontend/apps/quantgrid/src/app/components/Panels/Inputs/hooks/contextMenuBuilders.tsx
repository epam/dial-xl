import { MenuProps } from 'antd';

import Icon from '@ant-design/icons';
import {
  CommonMetadata,
  CopyIcon,
  DownloadIcon,
  EditIcon,
  getDropdownDivider,
  getDropdownItem,
  HistoryIcon,
  MetadataNodeType,
  MoveToIcon,
  publicBucket,
  RefreshIcon,
  ShareIcon,
  TablePlusIcon,
  TrashIcon,
} from '@frontend/common';

import {
  contextMenuActionKeys,
  ContextMenuEntityType,
  getContextMenuKey,
} from './contextMenuTypes';

export function buildImportSourceMenu(
  entityType: ContextMenuEntityType,
  entityKey: string,
  parentPath: string[],
): MenuProps['items'] {
  return [
    getDropdownItem({
      key: getContextMenuKey(
        contextMenuActionKeys.editImportSource,
        entityType,
        entityKey,
      ),
      fullPath: [...parentPath, 'EditSource', entityType, entityKey],
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
      fullPath: [...parentPath, 'SyncSource', entityType, entityKey],
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
      fullPath: [...parentPath, 'DeleteSource', entityType, entityKey],
      label: 'Delete source',
      icon: (
        <Icon
          className="text-text-secondary w-[18px]"
          component={() => <TrashIcon />}
        />
      ),
    }),
  ];
}

export function buildImportCatalogMenu(
  entityType: ContextMenuEntityType,
  entityKey: string,
  parentPath: string[],
): MenuProps['items'] {
  return [
    getDropdownItem({
      key: getContextMenuKey(
        contextMenuActionKeys.createTable,
        entityType,
        entityKey,
      ),
      fullPath: [...parentPath, 'CreateTable', entityType, entityKey],
      label: 'Create table',
      icon: (
        <Icon
          className="text-text-secondary w-[18px]"
          component={() => <TablePlusIcon />}
        />
      ),
    }),
    getDropdownItem({
      key: getContextMenuKey(
        contextMenuActionKeys.syncDataset,
        entityType,
        entityKey,
      ),
      fullPath: [...parentPath, 'SyncDataset', entityType, entityKey],
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
      fullPath: [...parentPath, 'PullNewData', entityType, entityKey],
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
      fullPath: [...parentPath, 'ViewVersions', entityType, entityKey],
      label: 'View versions',
      icon: (
        <Icon
          className="text-text-secondary w-[18px]"
          component={() => <HistoryIcon />}
        />
      ),
    }),
  ];
}

export function buildFileMenu(
  entityType: ContextMenuEntityType,
  entityKey: string,
  file: CommonMetadata,
  userBucket: string,
  isAdmin: boolean,
  hasEditPermissions: boolean,
  isExcelFile: boolean,
  parentPath: string[],
): MenuProps['items'] {
  const items: MenuProps['items'] = [];
  const isFolder = file.nodeType === MetadataNodeType.FOLDER;
  const isAbleToEdit =
    file.bucket === userBucket || (file.bucket === publicBucket && isAdmin);
  const isAbleToShare = file.bucket === userBucket;
  const isAbleToDelete = isAbleToEdit || hasEditPermissions;

  // Create table

  items.push(
    getDropdownItem({
      key: getContextMenuKey(
        contextMenuActionKeys.createTable,
        entityType,
        entityKey,
        file,
      ),
      fullPath: [...parentPath, 'CreateTable', entityType, entityKey],
      label: 'Create table',
      icon: (
        <Icon
          className="text-text-secondary w-[18px]"
          component={() => <TablePlusIcon />}
        />
      ),
    }),
    getDropdownItem({
      key: getContextMenuKey(
        contextMenuActionKeys.createTableInNewSheet,
        entityType,
        entityKey,
        file,
      ),
      fullPath: [...parentPath, 'CreateTableInNewSheet', entityType, entityKey],
      label: 'Create table in new sheet',
      icon: (
        <Icon
          className="text-text-secondary w-[18px]"
          component={() => <TablePlusIcon />}
        />
      ),
    }),
    getDropdownDivider(),
  );

  // Download
  if (!isFolder) {
    items.push(
      getDropdownItem({
        key: getContextMenuKey(
          contextMenuActionKeys.download,
          entityType,
          entityKey,
          file,
        ),
        fullPath: [...parentPath, 'Download', entityType, entityKey],
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

  // Rename and Clone
  if (!isFolder && isAbleToEdit) {
    items.push(
      getDropdownItem({
        key: getContextMenuKey(
          contextMenuActionKeys.rename,
          entityType,
          entityKey,
          file,
        ),
        fullPath: [...parentPath, 'Rename', entityType, entityKey],
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
        fullPath: [...parentPath, 'Clone', entityType, entityKey],
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

  // Move
  if (isAbleToEdit) {
    items.push(
      getDropdownItem({
        key: getContextMenuKey(
          contextMenuActionKeys.moveTo,
          entityType,
          entityKey,
          file,
        ),
        fullPath: [...parentPath, 'MoveTo', entityType, entityKey],
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

  // Share
  if (isAbleToShare) {
    items.push(
      getDropdownItem({
        key: getContextMenuKey(
          contextMenuActionKeys.share,
          entityType,
          entityKey,
          file,
        ),
        fullPath: [...parentPath, 'Share', entityType, entityKey],
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

  // Delete
  if (isAbleToDelete) {
    items.push(
      getDropdownItem({
        key: getContextMenuKey(
          contextMenuActionKeys.delete,
          entityType,
          entityKey,
          file,
        ),
        fullPath: [...parentPath, 'Delete', entityType, entityKey],
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

  // Copy path
  if (!isFolder) {
    items.push(
      getDropdownItem({
        key: getContextMenuKey(
          contextMenuActionKeys.copyPath,
          entityType,
          entityKey,
          file,
        ),
        fullPath: [...parentPath, 'CopyPath', entityType, entityKey],
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

  return items;
}

export function buildExcelSheetTableMenu(
  entityType: ContextMenuEntityType,
  entityKey: string,
  file: CommonMetadata,
  parentPath: string[],
): MenuProps['items'] {
  return [
    getDropdownItem({
      key: getContextMenuKey(
        contextMenuActionKeys.createTable,
        entityType,
        entityKey,
        file,
      ),
      fullPath: [...parentPath, 'CreateTable', entityType, entityKey],
      label: 'Create table',
      icon: (
        <Icon
          className="text-text-secondary w-[18px]"
          component={() => <TablePlusIcon />}
        />
      ),
    }),
    getDropdownItem({
      key: getContextMenuKey(
        contextMenuActionKeys.createTableInNewSheet,
        entityType,
        entityKey,
        file,
      ),
      fullPath: [...parentPath, 'CreateTableInNewSheet', entityType, entityKey],
      label: 'Create table in new sheet',
      icon: (
        <Icon
          className="text-text-secondary w-[18px]"
          component={() => <TablePlusIcon />}
        />
      ),
    }),
  ];
}
