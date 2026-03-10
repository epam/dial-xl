import { MenuProps } from 'antd';
import { DataNode, EventDataNode } from 'antd/es/tree';
import { useCallback, useContext, useState } from 'react';

import { CommonMetadata } from '@frontend/common';
import { MenuInfo } from '@rc-component/menu/lib/interface';

import { ApiContext, InputsContext, ProjectContext } from '../../../../context';
import {
  useApiRequests,
  useDeleteResources,
  useRequestDimTable,
} from '../../../../hooks';
import {
  useAntdModalStore,
  useImportSourceModalStore,
} from '../../../../store';
import {
  buildExcelSheetTableMenu,
  buildFileMenu,
  buildImportCatalogMenu,
  buildImportSourceMenu,
} from './contextMenuBuilders';
import { createContextMenuHandlers } from './contextMenuHandlers';
import {
  contextMenuActionKeys,
  determineEntityType,
  excelFileKey,
  InputChildData,
  parseContextMenuKey,
} from './contextMenuTypes';

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
      if (!userBucket) return;

      const key = info.node.key as string;
      const file = childData[key];

      const { entityType, entityKey } = determineEntityType(key);
      const isExcelFile = entityType === excelFileKey;
      const inputsMenuPath = ['InputsContextMenu'];

      let items: MenuProps['items'] = [];

      switch (entityType) {
        case 'import-source':
          items = buildImportSourceMenu(entityType, entityKey, inputsMenuPath);
          break;

        case 'import-catalog':
          items = buildImportCatalogMenu(entityType, entityKey, inputsMenuPath);
          break;

        case 'excel-file':
        case 'file':
          if (!file) {
            setItems([]);

            return;
          }
          items = buildFileMenu(
            entityType,
            entityKey,
            file,
            userBucket,
            isAdmin,
            hasEditPermissions,
            isExcelFile,
            inputsMenuPath,
          );
          break;

        case 'excel-table':
        case 'excel-sheet':
          if (!file) {
            setItems([]);

            return;
          }
          items = buildExcelSheetTableMenu(
            entityType,
            entityKey,
            file,
            inputsMenuPath,
          );
          break;

        default:
          break;
      }

      setItems((items || []).filter(Boolean) as MenuProps['items']);
    },
    [hasEditPermissions, isAdmin, userBucket],
  );

  const handlers = createContextMenuHandlers({
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
  });

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
        case contextMenuActionKeys.createTableInNewSheet:
          await handlers.handleCreateTable(action, entityType, entityKey, file);
          break;

        case contextMenuActionKeys.download:
          await handlers.handleDownload(entityType, file);
          break;

        case contextMenuActionKeys.delete:
          handlers.handleDelete(entityType, file);
          break;

        case contextMenuActionKeys.moveTo:
          handlers.handleMoveTo(entityType, file);
          break;

        case contextMenuActionKeys.rename:
          handlers.handleRename(entityType, file);
          break;

        case contextMenuActionKeys.clone:
          handlers.handleClone(entityType, file);
          break;

        case contextMenuActionKeys.share:
          handlers.handleShare(entityType, file);
          break;

        case contextMenuActionKeys.copyPath:
          handlers.handleCopyPath(entityType, file);
          break;

        case contextMenuActionKeys.editImportSource:
          await handlers.handleEditImportSource(entityType, entityKey);
          break;

        case contextMenuActionKeys.deleteImportSource:
          await handlers.handleDeleteImportSource(entityType, entityKey);
          break;

        case contextMenuActionKeys.pullNewData:
          handlers.handlePullNewData(entityType, entityKey);
          break;

        case contextMenuActionKeys.viewVersions:
          handlers.handleViewVersions(entityType, entityKey);
          break;

        case contextMenuActionKeys.syncImportSource:
          await handlers.handleSyncImportSource(entityType, entityKey);
          break;

        case contextMenuActionKeys.syncDataset:
          await handlers.handleSyncDataset(entityType, entityKey);
          break;

        default:
          break;
      }
    },
    [handlers],
  );

  return { items, onContextMenuClick, createContextMenuItems };
};
