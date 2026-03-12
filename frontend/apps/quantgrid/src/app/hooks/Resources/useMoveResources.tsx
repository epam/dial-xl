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

import { WithCustomProgressBar } from '../../components';
import { useAntdModalStore } from '../../store';
import { displayToast } from '../../utils';
import { useApiRequests } from '..';

export function useMoveResources() {
  const confirmModal = useAntdModalStore((s) => s.confirm);

  const { moveFile, moveProject, moveFolder } = useApiRequests();

  const handleMoveProject = useCallback(
    async ({
      item,
      targetPath,
      targetBucket,
      onProgress,
    }: {
      item: Pick<ResourceMetadata, 'bucket' | 'name' | 'parentPath'>;
      targetPath: string | null | undefined;
      targetBucket: string;
      onProgress?: (progress: number) => void;
    }) => {
      const { bucket, name, parentPath } = item;

      onProgress?.(0);

      const res = await moveProject({
        bucket: bucket,
        name: name,
        parentPath,
        targetPath,
        targetBucket,
        suppressErrors: true,
        onProgress,
      });

      if (!res.success) return;

      onProgress?.(100);
    },
    [moveProject],
  );

  const handleMoveFile = useCallback(
    async ({
      item,
      targetPath,
      targetBucket,
      onProgress,
    }: {
      item: Pick<ResourceMetadata, 'bucket' | 'name' | 'parentPath'>;
      targetPath: string | null | undefined;
      targetBucket: string;
      onProgress?: (progress: number) => void;
    }) => {
      const isCsvFile = item.name.endsWith(csvFileExtension);

      onProgress?.(0);

      const res = await moveFile({
        bucket: item.bucket,
        name: item.name,
        parentPath: item.parentPath,
        targetPath,
        targetBucket,
      });

      if (!isCsvFile) {
        onProgress?.(100);

        return;
      }

      onProgress?.(50);

      await moveFile({
        bucket: item.bucket,
        name: '.' + item.name.replaceAll(csvFileExtension, schemaFileExtension),
        parentPath: item.parentPath,
        targetPath,
        targetBucket,
        suppressErrors: true,
      });

      if (!res.success) return;

      onProgress?.(100);
    },
    [moveFile],
  );

  const handleMoveResource = useCallback(
    async ({
      item,
      targetPath,
      targetBucket,
      onProgress,
    }: {
      item: Pick<
        ResourceMetadata,
        'bucket' | 'name' | 'parentPath' | 'nodeType'
      >;
      targetPath: string | null | undefined;
      targetBucket: string;
      onProgress?: (progress: number) => void;
    }) => {
      const isProject = item.name.endsWith(dialProjectFileExtension);
      const isFolder = item.nodeType === MetadataNodeType.FOLDER;

      if (isProject) {
        await handleMoveProject({
          item,
          targetPath,
          targetBucket,
          onProgress,
        });
      } else if (isFolder) {
        const { bucket, name, parentPath } = item;

        if (targetPath === parentPath) return;

        const result = await moveFolder({
          bucket,
          parentPath,
          name,
          newName: name,
          targetParentPath: targetPath || undefined,
          targetBucket,
          suppressErrors: true,
          onProgress,
        });

        if (!result.success) return;
      } else {
        await handleMoveFile({
          item,
          targetPath,
          targetBucket,
          onProgress,
        });
      }
    },
    [handleMoveFile, handleMoveProject, moveFolder],
  );

  const handleMoveFiles = useCallback(
    async ({
      items,
      targetPath,
      targetBucket,
    }: {
      items: Pick<
        ResourceMetadata,
        'bucket' | 'name' | 'parentPath' | 'nodeType'
      >[];
      targetPath: string | null | undefined;
      targetBucket: string;
    }) => {
      const uploadingToast = toast(WithCustomProgressBar, {
        customProgressBar: true,
        data: {
          message: `Moving ${items.length} file${
            items.length > 1 ? 's' : ''
          }...`,
        },
      });

      let processingIndex = 0;
      for (const item of items) {
        const processingProgress = processingIndex / items.length;

        await handleMoveResource({
          item,
          targetPath,
          targetBucket,
          onProgress: (progress: number) => {
            toast.update(uploadingToast, {
              progress: processingProgress + progress / items.length / 100,
            });
          },
        });

        processingIndex++;
      }

      displayToast('success', appMessages.fileMoveSuccess);
      toast.dismiss(uploadingToast);
    },
    [handleMoveResource],
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
      onFinish?: () => void,
    ) => {
      const hasSharedFiles = items.some((item) => item.isSharedByMe);

      if (!hasSharedFiles) {
        await handleMoveFiles({
          items,
          targetPath,
          targetBucket,
        });

        onFinish?.();

        return;
      }

      confirmModal({
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
          await handleMoveFiles({
            items,
            targetPath,
            targetBucket,
          });

          onFinish?.();
        },
      });
    },

    [handleMoveFiles, confirmModal],
  );

  return {
    moveResources,
  };
}
