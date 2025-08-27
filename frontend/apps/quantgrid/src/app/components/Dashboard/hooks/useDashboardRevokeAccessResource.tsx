import { Modal } from 'antd';
import cx from 'classnames';
import { useCallback } from 'react';

import {
  appMessages,
  dialProjectFileExtension,
  FilesMetadata,
  MetadataNodeType,
  modalFooterButtonClasses,
  primaryButtonClasses,
  projectFoldersRootPrefix,
  secondaryButtonClasses,
} from '@frontend/common';

import { useApiRequests } from '../../../hooks';
import { constructPath, displayToast } from '../../../utils';

export function useDashboardRevokeAccessResource() {
  const { revokeResourcesAccess: revokeResourcesAccessRequest } =
    useApiRequests();

  const getContent = useCallback(
    (item: Pick<FilesMetadata, 'name' | 'bucket' | 'nodeType'>) => {
      const isProject = item.name.endsWith(dialProjectFileExtension);
      const fileName = isProject
        ? item.name.replace(dialProjectFileExtension, '')
        : item.name;
      const isFolder = item.nodeType === MetadataNodeType.FOLDER;
      const resourceName = isProject ? 'project' : isFolder ? 'folder' : 'file';

      return `Do you want to unshare ${resourceName} "${fileName}"?`;
    },
    []
  );

  const handleRevokeProject = useCallback(
    async (
      item: Pick<FilesMetadata, 'name' | 'bucket' | 'nodeType' | 'parentPath'>
    ) => {
      return Promise.allSettled([
        revokeResourcesAccessRequest([
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
            nodeType: MetadataNodeType.FOLDER,
          },
        ]),
      ]);
    },
    [revokeResourcesAccessRequest]
  );

  const revokeResourceAccess = useCallback(
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
            res = await handleRevokeProject(item);
          } else {
            res = await revokeResourcesAccessRequest([
              {
                name: item.name,
                bucket: item.bucket,
                path: item.parentPath,
                nodeType: item.nodeType,
              },
            ]);
          }

          if (res) {
            displayToast('info', appMessages.revokeAccessSuccess);

            onSuccess?.();
          }
        },
      });
    },
    [getContent, handleRevokeProject, revokeResourcesAccessRequest]
  );

  return {
    revokeResourceAccess,
  };
}
