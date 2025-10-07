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
    async (
      item: CloneItem,
      targetBucket?: string,
      targetPath?: string | null
    ) => {
      const { bucket, name, parentPath, newName } = item;

      if (!userBucket) {
        displayToast('error', apiMessages.cloneProjectClient);

        return;
      }

      const res = await cloneProject({
        bucket: bucket,
        name: name,
        parentPath,
        targetBucket: targetBucket ?? userBucket,
        targetPath:
          targetPath ?? bucket === userBucket ? parentPath ?? null : null,
        isReadOnly: !!(
          item?.permissions?.includes('READ') &&
          !item.permissions.includes('WRITE')
        ),
        newName,
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
    async (item: CloneItem, targetBucket?: string, targetPath?: string) => {
      const { bucket, name, parentPath, newName } = item;
      const isCsvFile = name.endsWith(csvFileExtension);

      if (!userBucket) {
        displayToast('error', apiMessages.cloneProjectClient);

        return;
      }

      const res = await cloneFile({
        bucket,
        name,
        parentPath,
        targetBucket: targetBucket ?? userBucket,
        targetPath:
          targetPath ?? bucket === userBucket ? parentPath ?? null : null,
        newName,
      });

      if (!isCsvFile) return;

      function toSchemaFileName(name: string) {
        return '.' + name.replaceAll(csvFileExtension, schemaFileExtension);
      }

      await cloneFile({
        bucket: bucket,
        name: toSchemaFileName(name),
        parentPath,
        targetBucket: targetBucket ?? userBucket,
        targetPath:
          targetPath ?? bucket === userBucket ? parentPath ?? null : null,
        suppressErrors: true,
        newName: newName ? toSchemaFileName(newName) : undefined,
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
      items: CloneItem[];
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
