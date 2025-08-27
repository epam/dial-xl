import { useCallback, useContext } from 'react';
import { toast } from 'react-toastify';

import {
  apiMessages,
  appMessages,
  csvFileExtension,
  dialProjectFileExtension,
  FilesMetadata,
  schemaFileExtension,
} from '@frontend/common';

import { ApiContext } from '../../context';
import { displayToast } from '../../utils';
import { useApiRequests } from '..';

export function useCloneResources() {
  const { userBucket } = useContext(ApiContext);
  const { cloneFile, cloneProject } = useApiRequests();

  const handleCloneProject = useCallback(
    async (
      item: Pick<
        FilesMetadata,
        'bucket' | 'name' | 'parentPath' | 'permissions'
      >,
      targetBucket?: string,
      targetPath?: string | null
    ) => {
      const { bucket, name, parentPath } = item;

      if (!userBucket) {
        displayToast('error', apiMessages.cloneProjectClient);

        return;
      }

      const res = await cloneProject({
        bucket: bucket,
        name: name,
        path: parentPath,
        targetBucket: targetBucket ?? userBucket,
        targetPath:
          targetPath ?? bucket === userBucket ? parentPath ?? null : null,
        isReadOnly: !!(
          item?.permissions?.includes('READ') &&
          !item.permissions.includes('WRITE')
        ),
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
    [cloneProject, userBucket]
  );

  const handleCloneFile = useCallback(
    async (
      item: Pick<FilesMetadata, 'bucket' | 'name' | 'parentPath'>,
      targetBucket?: string,
      targetPath?: string
    ) => {
      const isCsvFile = item.name.endsWith(csvFileExtension);

      if (!userBucket) {
        displayToast('error', apiMessages.cloneProjectClient);

        return;
      }

      const res = await cloneFile({
        bucket: item.bucket,
        name: item.name,
        path: item.parentPath,
        targetBucket: targetBucket ?? userBucket,
        targetPath:
          targetPath ?? item.bucket === userBucket
            ? item.parentPath ?? null
            : null,
      });

      if (!isCsvFile) return;

      await cloneFile({
        bucket: item.bucket,
        name: '.' + item.name.replaceAll(csvFileExtension, schemaFileExtension),
        path: item.parentPath,
        targetBucket: targetBucket ?? userBucket,
        targetPath:
          targetPath ?? item.bucket === userBucket
            ? item.parentPath ?? null
            : null,
        suppressErrors: true,
      });

      if (!res) return;

      displayToast('success', appMessages.fileCloneSuccess);
    },
    [cloneFile, userBucket]
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
