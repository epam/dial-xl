import { Modal } from 'antd';
import cx from 'classnames';
import { useCallback } from 'react';

import {
  appMessages,
  dialProjectFileExtension,
  MetadataNodeType,
  modalFooterButtonClasses,
  primaryButtonClasses,
  projectFoldersRootPrefix,
  ResourceMetadata,
  secondaryButtonClasses,
} from '@frontend/common';

import { useApiRequests } from '../../../hooks';
import { constructPath, displayToast } from '../../../utils';

export function useDashboardDiscardAccessResource() {
  const { discardResourcesAccess: discardResourcesAccessRequest } =
    useApiRequests();

  const getContent = useCallback(
    (item: Pick<ResourceMetadata, 'name' | 'bucket' | 'nodeType'>) => {
      const isProject = item.name.endsWith(dialProjectFileExtension);
      const fileName = isProject
        ? item.name.replace(dialProjectFileExtension, '')
        : item.name;
      const isFolder = item.nodeType === MetadataNodeType.FOLDER;
      const resourceName = isProject ? 'project' : isFolder ? 'folder' : 'file';

      return `Do you want to discard shared with you ${resourceName} "${fileName}"?`;
    },
    []
  );

  const handleDiscardProject = useCallback(
    async (
      item: Pick<
        ResourceMetadata,
        'name' | 'bucket' | 'nodeType' | 'parentPath' | 'resourceType'
      >
    ) => {
      return Promise.allSettled([
        discardResourcesAccessRequest([
          {
            name: item.name,
            bucket: item.bucket,
            parentPath: item.parentPath,
            nodeType: item.nodeType,
            resourceType: item.resourceType,
          },
          {
            name: item.name.replaceAll(dialProjectFileExtension, ''),
            bucket: item.bucket,
            parentPath: constructPath([
              projectFoldersRootPrefix,
              item.parentPath,
            ]),
            nodeType: MetadataNodeType.FOLDER,
            resourceType: item.resourceType,
          },
        ]),
      ]);
    },
    [discardResourcesAccessRequest]
  );

  const discardResourceAccess = useCallback(
    (
      item: Pick<
        ResourceMetadata,
        'name' | 'bucket' | 'nodeType' | 'parentPath' | 'resourceType'
      >,
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
                parentPath: item.parentPath,
                nodeType: item.nodeType,
                resourceType: item.resourceType,
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
