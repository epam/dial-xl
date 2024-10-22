import { Modal } from 'antd';
import cx from 'classnames';
import { useCallback } from 'react';

import {
  appMessages,
  dialProjectFileExtension,
  FilesMetadata,
  modalFooterButtonClasses,
  primaryButtonClasses,
  projectFoldersRootPrefix,
  secondaryButtonClasses,
} from '@frontend/common';

import { useApiRequests } from '../../../hooks';
import { constructPath, displayToast } from '../../../utils';

export function useDashboardDiscardAccessResource() {
  const { discardResourcesAccess: discardResourcesAccessRequest } =
    useApiRequests();

  const getContent = useCallback(
    (item: Pick<FilesMetadata, 'name' | 'bucket' | 'nodeType'>) => {
      const isProject = item.name.endsWith(dialProjectFileExtension);
      const fileName = isProject
        ? item.name.replace(dialProjectFileExtension, '')
        : item.name;
      const isFolder = item.nodeType === 'FOLDER';
      const resourceName = isProject ? 'project' : isFolder ? 'folder' : 'file';

      return `Do you want to discard shared with you ${resourceName} "${fileName}"?`;
    },
    []
  );

  const handleDiscardProject = useCallback(
    async (
      item: Pick<FilesMetadata, 'name' | 'bucket' | 'nodeType' | 'parentPath'>
    ) => {
      return Promise.allSettled([
        discardResourcesAccessRequest([
          {
            name: item.name,
            bucket: item.bucket,
            path: item.parentPath,
            nodeType: item.nodeType,
          },
          {
            name: item.name.replaceAll(dialProjectFileExtension, ''),
            bucket: item.bucket,
            path: constructPath([projectFoldersRootPrefix, item.parentPath]),
            nodeType: 'FOLDER',
          },
        ]),
      ]);
    },
    [discardResourcesAccessRequest]
  );

  const discardResourceAccess = useCallback(
    (
      item: Pick<FilesMetadata, 'name' | 'bucket' | 'nodeType' | 'parentPath'>,
      onSuccess?: () => void
    ) => {
      Modal.confirm({
        icon: null,
        title: 'Confirm',
        content: getContent(item),
        okButtonProps: {
          className: cx(modalFooterButtonClasses, primaryButtonClasses),
        },
        cancelButtonProps: {
          className: cx(modalFooterButtonClasses, secondaryButtonClasses),
        },
        onOk: async () => {
          const isProject = item.name.endsWith(dialProjectFileExtension);

          let res;
          if (isProject) {
            res = await handleDiscardProject(item);
          } else {
            res = await discardResourcesAccessRequest([
              {
                name: item.name,
                bucket: item.bucket,
                path: item.parentPath,
                nodeType: item.nodeType,
              },
            ]);
          }

          if (res) {
            displayToast('info', appMessages.discardAccessSuccess);

            onSuccess?.();
          }
        },
      });
    },
    [getContent, handleDiscardProject, discardResourcesAccessRequest]
  );

  return {
    discardResourceAccess,
  };
}
