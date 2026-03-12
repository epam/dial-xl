import { useCallback, useContext } from 'react';
import { toast } from 'react-toastify';

import {
  apiMessages,
  appMessages,
  csvFileExtension,
  dialProjectFileExtension,
  ResourceMetadata,
  schemaFileExtension,
} from '@frontend/common';

import { WithCustomProgressBar } from '../../components';
import { ApiContext } from '../../context';
import { displayToast } from '../../utils';
import { useApiRequests } from '..';

type CloneItem = Pick<
  ResourceMetadata,
  'bucket' | 'name' | 'parentPath' | 'permissions'
> & { newName?: string };

export function useCloneResources() {
  const { userBucket } = useContext(ApiContext);
  const { cloneFile, cloneProject } = useApiRequests();

  const handleCloneProject = useCallback(
    async ({
      item,
      targetBucket,
      targetPath,
      onProgress,
    }: {
      item: CloneItem;
      targetBucket?: string;
      targetPath?: string | null;
      onProgress?: (progress: number) => void;
    }) => {
      const { bucket, name, parentPath, newName } = item;

      if (!userBucket) {
        displayToast('error', apiMessages.cloneProjectClient);

        return;
      }
      onProgress?.(0);

      const res = await cloneProject({
        bucket: bucket,
        name: name,
        parentPath,
        targetBucket: targetBucket ?? userBucket,
        targetPath:
          (targetPath ?? bucket === userBucket) ? (parentPath ?? null) : null,
        isReadOnly: !!(
          item?.permissions?.includes('READ') &&
          !item.permissions.includes('WRITE')
        ),
        newName,
        onProgress,
      });

      if (!res.success) return;

      onProgress?.(100);
    },
    [cloneProject, userBucket],
  );

  const handleCloneFile = useCallback(
    async ({
      item,
      targetBucket,
      targetPath,
      onProgress,
    }: {
      item: CloneItem;
      targetBucket?: string;
      targetPath?: string;
      onProgress?: (progress: number) => void;
    }) => {
      const { bucket, name, parentPath, newName } = item;
      const isCsvFile = name.endsWith(csvFileExtension);

      if (!userBucket) {
        displayToast('error', apiMessages.cloneProjectClient);

        return;
      }

      onProgress?.(0);

      const res = await cloneFile({
        bucket,
        name,
        parentPath,
        targetBucket: targetBucket ?? userBucket,
        targetPath:
          (targetPath ?? bucket === userBucket) ? (parentPath ?? null) : null,
        newName,
      });

      if (!isCsvFile) {
        onProgress?.(100);

        return;
      }

      onProgress?.(50);

      function toSchemaFileName(name: string) {
        onProgress?.(50);

        return '.' + name.replaceAll(csvFileExtension, schemaFileExtension);
      }

      await cloneFile({
        bucket: bucket,
        name: toSchemaFileName(name),
        parentPath,
        targetBucket: targetBucket ?? userBucket,
        targetPath:
          (targetPath ?? bucket === userBucket) ? (parentPath ?? null) : null,
        suppressErrors: true,
        newName: newName ? toSchemaFileName(newName) : undefined,
      });

      if (!res.success) return;

      onProgress?.(100);
    },
    [cloneFile, userBucket],
  );

  const cloneResources = useCallback(
    async ({
      items,
      targetBucket,
      targetPath,
    }: {
      items: CloneItem[];
      targetBucket?: string;
      targetPath?: string;
    }) => {
      const uploadingToast = toast(WithCustomProgressBar, {
        customProgressBar: true,
        data: {
          message: `Cloning ${items.length} file${
            items.length > 1 ? 's' : ''
          }...`,
        },
      });

      let processingIndex = 0;
      for (const item of items) {
        const isProject = item.name.endsWith(dialProjectFileExtension);
        const processingProgress = processingIndex / items.length;

        if (isProject) {
          await handleCloneProject({
            item,
            targetBucket,
            targetPath,
            onProgress: (progress: number) => {
              toast.update(uploadingToast, {
                progress: processingProgress + progress / items.length / 100,
              });
            },
          });
        } else {
          await handleCloneFile({
            item,
            targetBucket,
            targetPath,
            onProgress: (progress: number) => {
              toast.update(uploadingToast, {
                progress: processingProgress + progress / items.length / 100,
              });
            },
          });
        }

        processingIndex++;
      }

      displayToast('success', appMessages.fileCloneSuccess);
      toast.dismiss(uploadingToast);
    },
    [handleCloneFile, handleCloneProject],
  );

  return {
    cloneResources,
  };
}
