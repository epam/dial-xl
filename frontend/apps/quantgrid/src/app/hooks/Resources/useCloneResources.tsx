import { useCallback } from 'react';
import { toast } from 'react-toastify';

import {
  appMessages,
  csvFileExtension,
  dialProjectFileExtension,
  FilesMetadata,
  schemaFileExtension,
} from '@frontend/common';

import { displayToast } from '../../utils';
import { useApiRequests } from '..';

export function useCloneResources() {
  const { cloneFile, cloneProject } = useApiRequests();

  const handleCloneProject = useCallback(
    async (
      item: Pick<FilesMetadata, 'bucket' | 'name' | 'parentPath'>,
      targetBucket?: string,
      targetPath?: string | null
    ) => {
      const { bucket, name, parentPath } = item;

      const res = await cloneProject({
        bucket: bucket,
        name: name,
        path: parentPath,
        targetBucket,
        targetPath,
      });

      if (!res) return;

      displayToast(
        'success',
        appMessages.projectCloneSuccess(
          name.replaceAll(dialProjectFileExtension, ''),
          res.newClonedProjectName.replaceAll(dialProjectFileExtension, '')
        )
      );
    },
    [cloneProject]
  );

  const handleCloneFile = useCallback(
    async (
      item: Pick<FilesMetadata, 'bucket' | 'name' | 'parentPath'>,
      targetBucket?: string,
      targetPath?: string
    ) => {
      const isCsvFile = item.name.endsWith(csvFileExtension);

      const res = await cloneFile({
        bucket: item.bucket,
        name: item.name,
        path: item.parentPath,
        targetBucket,
        targetPath,
      });

      if (!isCsvFile) return;

      await cloneFile({
        bucket: item.bucket,
        name: '.' + item.name.replaceAll(csvFileExtension, schemaFileExtension),
        path: item.parentPath,
      });

      if (!res) return;

      displayToast('success', appMessages.fileCloneSuccess);
    },
    [cloneFile]
  );

  const cloneResources = useCallback(
    async ({
      items,
      targetBucket,
      targetPath,
    }: {
      items: Pick<FilesMetadata, 'bucket' | 'name' | 'parentPath'>[];
      targetBucket?: string;
      targetPath?: string;
    }) => {
      toast.loading(
        `Cloning ${items.length} file${items.length > 1 ? 's' : ''}...`,
        { toastId: 'loading' }
      );

      for (const item of items) {
        const isProject = item.name.endsWith(dialProjectFileExtension);

        if (isProject) {
          await handleCloneProject(item, targetBucket, targetPath);
        } else {
          await handleCloneFile(item, targetBucket, targetPath);
        }
      }

      toast.dismiss('loading');
    },
    [handleCloneFile, handleCloneProject]
  );

  return {
    cloneResources,
  };
}
