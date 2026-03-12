import classNames from 'classnames';
import { toast } from 'react-toastify';

import {
  ApiRequestFunctionWithError,
  ApiResult,
  CommonMetadata,
  filesEndpointType,
  makeCopy,
  modalFooterButtonClasses,
  primaryButtonClasses,
  secondaryButtonClasses,
} from '@frontend/common';

import {
  ImportSourceModalConfig,
  useCreateTableFromImportModalStore,
  useExcelPreviewStore,
  useShareFilesModalStore,
  useViewImportVersionsModalStore,
} from '../../../../store';
import { constructPath, encodeApiUrl } from '../../../../utils';
import { createTableFromInput, InputType } from '../utils';
import {
  contextMenuActionKeys,
  ContextMenuEntityType,
  csvFileKey,
  excelFileKey,
  excelSheetKey,
  excelTableKey,
} from './contextMenuTypes';

export interface ContextMenuHandlersParams {
  requestDimSchemaForDimFormula: (params: {
    col: number;
    row: number;
    value: string;
    newTableName: string;
    createInNewSheet: boolean;
  }) => void;
  downloadFiles: (params: {
    files: Array<{
      bucket: string;
      name: string;
      parentPath: string | null | undefined;
    }>;
  }) => Promise<ApiResult<void>>;
  deleteResources: (resources: CommonMetadata[], onSuccess: () => void) => void;
  getInputs: () => void;
  onMove: (item: CommonMetadata) => void;
  onRename: (item: CommonMetadata) => void;
  onClone: (item: CommonMetadata) => void;
  openImport: (config: ImportSourceModalConfig) => Promise<boolean>;
  getImportSources: () => Promise<void>;
  confirmModal: (config: {
    icon: null;
    title: string;
    content: string;
    okButtonProps: { className: string };
    cancelButtonProps: { className: string };
    onOk: () => Promise<void>;
  }) => void;
  deleteImportSource: ApiRequestFunctionWithError<
    {
      project: string;
      source: string;
    },
    Response
  >;
  projectBucket: string | null;
  projectPath: string | null | undefined;
  projectName: string | null;
  syncAllImports: (params?: {
    source?: string;
    dataset?: string;
  }) => Promise<void>;
}

export function createContextMenuHandlers(params: ContextMenuHandlersParams) {
  const {
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
  } = params;

  return {
    handleCreateTable: async (
      action: string,
      entityType: ContextMenuEntityType,
      entityKey: string,
      file?: CommonMetadata,
    ) => {
      const createInNewSheet =
        action === contextMenuActionKeys.createTableInNewSheet;

      // Determine input type and extract entity name for excel
      let inputType: InputType | null = null;
      let excelEntityName: string | undefined;
      let sourceKey: string | undefined;
      let datasetKey: string | undefined;
      let sourceName: string | undefined;

      if (entityType === csvFileKey) {
        inputType = 'csv';
      } else if (entityType === 'import-catalog') {
        inputType = 'import-catalog';
        [sourceKey, datasetKey, sourceName] = entityKey.split(':');
      } else if (entityType === excelFileKey) {
        inputType = 'excel-file';
        excelEntityName = entityKey;
      } else if (entityType === excelSheetKey || entityType === excelTableKey) {
        const parsedEntityName = entityKey.split(':');
        if (parsedEntityName.length >= 2) {
          excelEntityName = parsedEntityName[parsedEntityName.length - 1];
          inputType =
            entityType === excelSheetKey ? 'excel-sheet' : 'excel-table';
        }
      }

      if (!inputType) return;

      createTableFromInput({
        type: inputType,
        file,
        excelEntityName,
        sourceKey,
        datasetKey,
        sourceName,
        createInNewSheet,
        onCreateFormula: requestDimSchemaForDimFormula,
        onOpenImportModal: (sk, dk, sn) =>
          useCreateTableFromImportModalStore.getState().open(sk, dk, sn),
        onOpenExcelModal: (file) =>
          useExcelPreviewStore.getState().open(file, createInNewSheet),
      });
    },

    handleDownload: async (
      entityType: ContextMenuEntityType,
      file?: CommonMetadata,
    ) => {
      if ((entityType === csvFileKey || entityType === excelFileKey) && file) {
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
        if (!result.success) {
          toast.error('Error happened during downloading file');
        }
      }
    },

    handleDelete: (
      entityType: ContextMenuEntityType,
      file?: CommonMetadata,
    ) => {
      if ((entityType === csvFileKey || entityType === excelFileKey) && file) {
        deleteResources([file], () => {
          getInputs();
        });
      }
    },

    handleMoveTo: (
      entityType: ContextMenuEntityType,
      file?: CommonMetadata,
    ) => {
      if ((entityType === csvFileKey || entityType === excelFileKey) && file) {
        onMove(file);
      }
    },

    handleRename: (
      entityType: ContextMenuEntityType,
      file?: CommonMetadata,
    ) => {
      if ((entityType === csvFileKey || entityType === excelFileKey) && file) {
        onRename(file);
      }
    },

    handleClone: (entityType: ContextMenuEntityType, file?: CommonMetadata) => {
      if ((entityType === csvFileKey || entityType === excelFileKey) && file) {
        onClone(file);
      }
    },

    handleShare: (entityType: ContextMenuEntityType, file?: CommonMetadata) => {
      if ((entityType === csvFileKey || entityType === excelFileKey) && file) {
        useShareFilesModalStore.getState().open([file]);
      }
    },

    handleCopyPath: (
      entityType: ContextMenuEntityType,
      file?: CommonMetadata,
    ) => {
      if ((entityType === csvFileKey || entityType === excelFileKey) && file) {
        makeCopy(file.url);
        toast.info('Input path copied to clipboard');
      }
    },

    handleEditImportSource: async (
      entityType: ContextMenuEntityType,
      entityKey: string,
    ) => {
      if (entityType === 'import-source') {
        const [sourceKey] = entityKey.split(':');
        await openImport({ source: sourceKey });
        getImportSources();
      }
    },

    handleDeleteImportSource: async (
      entityType: ContextMenuEntityType,
      entityKey: string,
    ) => {
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
            const result = await deleteImportSource({
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

            if (!result.success) return;

            getImportSources();
          },
        });
      }
    },

    handlePullNewData: (
      entityType: ContextMenuEntityType,
      entityKey: string,
    ) => {
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
    },

    handleViewVersions: (
      entityType: ContextMenuEntityType,
      entityKey: string,
    ) => {
      if (entityType === 'import-catalog') {
        const [sourceKey, datasetKey] = entityKey.split(':');
        useViewImportVersionsModalStore.getState().open(sourceKey, datasetKey);
      }
    },

    handleSyncImportSource: async (
      entityType: ContextMenuEntityType,
      entityKey: string,
    ) => {
      if (entityType === 'import-source') {
        const [sourceKey] = entityKey.split(':');
        syncAllImports({ source: sourceKey });
      }
    },

    handleSyncDataset: async (
      entityType: ContextMenuEntityType,
      entityKey: string,
    ) => {
      if (entityType === 'import-catalog') {
        const [sourceKey, datasetKey] = entityKey.split(':');
        syncAllImports({ source: sourceKey, dataset: datasetKey });
      }
    },
  };
}
