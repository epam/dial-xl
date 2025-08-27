import { Modal } from 'antd';
import cx from 'classnames';
import { useCallback } from 'react';
import { toast } from 'react-toastify';

import {
  csvFileExtension,
  dialProjectFileExtension,
  FilesMetadata,
  MetadataNodeType,
  modalFooterButtonClasses,
  primaryButtonClasses,
  schemaFileExtension,
  secondaryButtonClasses,
} from '@frontend/common';

import {
  deleteProjectHistory,
  deleteRecentProjectFromRecentProjects,
} from '../../services';
import { useApiRequests } from '..';

export function useDeleteResources() {
  const { deleteFile, deleteFolder, deleteProject } = useApiRequests();

  const handleDeleteProject = useCallback(
    async (item: Pick<FilesMetadata, 'bucket' | 'name' | 'parentPath'>) => {
      const { bucket, name, parentPath } = item;
      const projectName = name.replace(dialProjectFileExtension, '');
      const res = await deleteProject({
        name: projectName,
        path: parentPath,
        bucket,
      });

      if (!res) return;

      toast.success(`Project '${projectName}' successfully deleted`);

      deleteProjectHistory(projectName, bucket, parentPath);
      deleteRecentProjectFromRecentProjects(projectName, bucket, parentPath);
    },
    [deleteProject]
  );

  const handleDeleteFolder = useCallback(
    async (item: Pick<FilesMetadata, 'bucket' | 'name' | 'parentPath'>) => {
      const result = await deleteFolder({
        bucket: item.bucket,
        name: item.name,
        parentPath: item.parentPath,
      });

      if (!result) return;

      toast.success(`Folder '${item.name}' successfully deleted`);
    },
    [deleteFolder]
  );

  const handleDeleteFile = useCallback(
    async (item: Pick<FilesMetadata, 'bucket' | 'name' | 'parentPath'>) => {
      const isCsvFile = item.name.endsWith(csvFileExtension);

      const result = await deleteFile({
        bucket: item.bucket,
        fileName: item.name,
        path: item.parentPath,
      });

      if (!result) return;

      toast.success(`File '${item.name}' successfully deleted`);

      if (!isCsvFile) return;

      await deleteFile({
        bucket: item.bucket,
        fileName:
          '.' + item.name.replaceAll(csvFileExtension, schemaFileExtension),
        path: item.parentPath,
        suppressErrors: true,
      });
    },
    [deleteFile]
  );

  const getContent = useCallback(
    (
      items: Pick<
        FilesMetadata,
        'bucket' | 'name' | 'parentPath' | 'nodeType'
      >[]
    ) => {
      if (items.length > 1)
        return `Do you want to delete ${items.length} selected items?`;

      const item = items[0];
      const isProject = item.name.endsWith(dialProjectFileExtension);
      const fileName = isProject
        ? item.name.replace(dialProjectFileExtension, '')
        : item.name;
      const isFolder = item.nodeType === MetadataNodeType.FOLDER;
      const resourceName = isProject ? 'project' : isFolder ? 'folder' : 'file';

      return `Do you want to delete ${resourceName} "${fileName}"?`;
    },
    []
  );

  const deleteResources = useCallback(
    (
      items: Pick<
        FilesMetadata,
        'bucket' | 'name' | 'parentPath' | 'nodeType'
      >[],
      onFinish?: () => void
    ) => {
      Modal.confirm({
        icon: null,
        title: 'Confirm',
        content: getContent(items),
        okButtonProps: {
          className: cx(modalFooterButtonClasses, primaryButtonClasses),
        },
        cancelButtonProps: {
          className: cx(modalFooterButtonClasses, secondaryButtonClasses),
        },
        onOk: async () => {
          for (const item of items) {
            const isProject = item.name.endsWith(dialProjectFileExtension);
            const isFolder = item.nodeType === MetadataNodeType.FOLDER;

            if (isProject) {
              await handleDeleteProject(item);
            } else if (isFolder) {
              await handleDeleteFolder(item);
            } else {
              await handleDeleteFile(item);
            }
          }

          onFinish?.();
        },
      });
    },
    [getContent, handleDeleteFile, handleDeleteFolder, handleDeleteProject]
  );

  return {
    deleteResources,
  };
}
