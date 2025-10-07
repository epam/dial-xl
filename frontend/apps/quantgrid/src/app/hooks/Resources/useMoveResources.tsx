import { Modal } from 'antd';
import cx from 'classnames';
import { useCallback } from 'react';
import { toast } from 'react-toastify';

import {
  appMessages,
  csvFileExtension,
  dialProjectFileExtension,
  MetadataNodeType,
  modalFooterButtonClasses,
  primaryButtonClasses,
  ResourceMetadata,
  schemaFileExtension,
  secondaryButtonClasses,
} from '@frontend/common';

import { constructPath, displayToast } from '../../utils';
import { useApiRequests } from '..';

export function useMoveResources() {
  const { moveFile, moveProject, getFiles } = useApiRequests();

  const handleMoveProject = useCallback(
    async (
      item: Pick<ResourceMetadata, 'bucket' | 'name' | 'parentPath'>,
      targetPath: string | null | undefined,
      targetBucket: string
    ) => {
      const { bucket, name, parentPath } = item;

      const res = await moveProject({
        bucket: bucket,
        name: name,
        parentPath,
        targetPath,
        targetBucket,
        suppressErrors: true,
      });

      if (!res) return;

      displayToast('success', appMessages.projectMoveSuccess);
    },
    [moveProject]
  );

  const handleMoveFile = useCallback(
    async (
      item: Pick<ResourceMetadata, 'bucket' | 'name' | 'parentPath'>,
      targetPath: string | null | undefined,
      targetBucket: string
    ) => {
      const isCsvFile = item.name.endsWith(csvFileExtension);

      const res = await moveFile({
        bucket: item.bucket,
        name: item.name,
        parentPath: item.parentPath,
        targetPath,
        targetBucket,
      });

      if (!isCsvFile) return;

      await moveFile({
        bucket: item.bucket,
        name: '.' + item.name.replaceAll(csvFileExtension, schemaFileExtension),
        parentPath: item.parentPath,
        targetPath,
        targetBucket,
        suppressErrors: true,
      });

      if (!res) return;

      displayToast('success', appMessages.fileMoveSuccess);
    },
    [moveFile]
  );

  const handleMoveResource = useCallback(
    async (
      item: Pick<
        ResourceMetadata,
        'bucket' | 'name' | 'parentPath' | 'nodeType'
      >,
      targetPath: string | null | undefined,
      targetBucket: string
    ) => {
      const isProject = item.name.endsWith(dialProjectFileExtension);
      const isFolder = item.nodeType === MetadataNodeType.FOLDER;

      if (isProject) {
        await handleMoveProject(item, targetPath, targetBucket);
      } else if (isFolder) {
        const { bucket, name, parentPath } = item;

        if (targetPath === parentPath) return;

        const folderFiles = await getFiles({
          path: constructPath([bucket, parentPath, name]) + '/',
          isRecursive: true,
          suppressErrors: true,
        });

        if (!folderFiles) return;

        const folderTargetPath = constructPath([targetPath, name]);

        for (const file of folderFiles) {
          await handleMoveResource(file, folderTargetPath, targetBucket);
        }
      } else {
        await handleMoveFile(item, targetPath, targetBucket);
      }
    },
    [getFiles, handleMoveFile, handleMoveProject]
  );

  const handleMoveFiles = useCallback(
    async (
      items: Pick<
        ResourceMetadata,
        'bucket' | 'name' | 'parentPath' | 'nodeType'
      >[],
      targetPath: string | null | undefined,
      targetBucket: string
    ) => {
      toast.loading(
        `Moving ${items.length} file${items.length > 1 ? 's' : ''}...`,
        { toastId: 'loading' }
      );

      for (const item of items) {
        await handleMoveResource(item, targetPath, targetBucket);
      }

      toast.dismiss('loading');
    },
    [handleMoveResource]
  );

  const moveResources = useCallback(
    async (
      items: (Pick<
        ResourceMetadata,
        'bucket' | 'name' | 'parentPath' | 'nodeType'
      > & {
        isSharedByMe?: boolean;
      })[],
      targetPath: string | null | undefined,
      targetBucket: string,
      onFinish?: () => void
    ) => {
      const hasSharedFiles = items.some((item) => item.isSharedByMe);

      if (!hasSharedFiles) {
        await handleMoveFiles(items, targetPath, targetBucket);

        onFinish?.();

        return;
      }

      Modal.confirm({
        icon: null,
        title: 'Confirm moving files',
        content: `Moving will stop sharing and other users will no longer see this file${
          items.length > 1 ? 's' : ''
        }`,
        okButtonProps: {
          className: cx(modalFooterButtonClasses, primaryButtonClasses),
        },
        cancelButtonProps: {
          className: cx(modalFooterButtonClasses, secondaryButtonClasses),
        },
        onOk: async () => {
          await handleMoveFiles(items, targetPath, targetBucket);

          onFinish?.();
        },
      });
    },

    [handleMoveFiles]
  );

  return {
    moveResources,
  };
}
