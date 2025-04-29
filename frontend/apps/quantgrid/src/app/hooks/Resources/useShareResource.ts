import { useCallback } from 'react';

import {
  appMessages,
  bindConversationsRootFolder,
  csvFileExtension,
  dialProjectFileExtension,
  projectFoldersRootPrefix,
  ResourcePermission,
  schemaFileExtension,
} from '@frontend/common';

import {
  collectFilesFromProject,
  constructPath,
  displayToast,
  encodeApiUrl,
  getFilesShareUrl,
  getProjectShareUrl,
  safeEncodeURIComponent,
} from '../../utils';
import { useApiRequests } from '../';

export function useShareResources() {
  const {
    getProject: getProjectRequest,
    shareFiles: shareFilesRequest,
    getFiles: getFilesRequest,
  } = useApiRequests();

  const getCsvFileDependentFiles = useCallback(
    ({
      name,
      bucket,
      parentPath,
    }: {
      name: string;
      bucket: string;
      parentPath: string | null | undefined;
      nodeType: 'FOLDER' | 'ITEM';
    }) => {
      const schemaFileName =
        '.' + name.replaceAll(csvFileExtension, schemaFileExtension);
      const schemaFileUrl = encodeApiUrl(
        constructPath(['files', bucket, parentPath, schemaFileName])
      );

      return [schemaFileUrl];
    },
    []
  );

  const getProjectDependentFiles = useCallback(
    async ({
      name,
      bucket,
      parentPath,
    }: {
      name: string;
      bucket: string;
      parentPath: string | null | undefined;
      nodeType: 'FOLDER' | 'ITEM';
    }): Promise<string[] | undefined> => {
      const projectName = name.replaceAll(dialProjectFileExtension, '');
      let projectFilesUrlsInSheets: string[] | undefined = [];

      const project = await getProjectRequest({
        name: projectName,
        bucket,
        path: parentPath,
      });

      if (!project) return;

      projectFilesUrlsInSheets = collectFilesFromProject(
        project.sheets.map((sheet) => sheet.content)
      );

      if (!projectFilesUrlsInSheets) return;

      const sharedFolderUrl = encodeApiUrl(
        constructPath([
          'files',
          bucket,
          projectFoldersRootPrefix,
          parentPath,
          projectName,
        ]) + '/'
      );

      return [sharedFolderUrl, ...projectFilesUrlsInSheets];
    },
    [getProjectRequest]
  );

  const handleCollectResourceDependentFiles = useCallback(
    async (
      resources: {
        name: string;
        bucket: string;
        parentPath: string | null | undefined;
        nodeType: 'FOLDER' | 'ITEM';
      }[],
      ignoreResourceItself = false,
      shareProjectConnectedChats = false
    ) => {
      const resourceUrlsSet: Set<string> = new Set();

      for (const resource of resources) {
        const isProject = resource.name.endsWith(dialProjectFileExtension);
        const isCsv = resource.name.endsWith(csvFileExtension);
        const isFolder = resource.nodeType === 'FOLDER';

        const resourceUrl = encodeApiUrl(
          constructPath([
            'files',
            resource.bucket,
            resource.parentPath,
            resource.name,
          ]) + (resource.nodeType === 'FOLDER' ? '/' : '')
        );

        if (!ignoreResourceItself) {
          resourceUrlsSet.add(resourceUrl);
        }

        if (isProject) {
          if (shareProjectConnectedChats) {
            resourceUrlsSet.add(
              constructPath([
                'conversations',
                resource.bucket,
                bindConversationsRootFolder,
                resource.parentPath,
                safeEncodeURIComponent(
                  resource.name.replaceAll(dialProjectFileExtension, '')
                ),
              ]) + '/'
            );
          }
          const projectFilesUrlsInSheets = await getProjectDependentFiles(
            resource
          );

          if (!projectFilesUrlsInSheets) return;

          projectFilesUrlsInSheets.forEach((url) => resourceUrlsSet.add(url));
        } else if (isCsv) {
          const csvFiles = getCsvFileDependentFiles(resource);

          csvFiles.forEach((url) => resourceUrlsSet.add(url));
        } else if (isFolder) {
          const folderFiles = await getFilesRequest({
            path:
              constructPath([
                resource.bucket,
                resource.parentPath,
                resource.name,
              ]) + '/',
            isRecursive: true,
            suppressErrors: true,
          });

          if (!folderFiles) return;

          const resolvedFolderFiles = await handleCollectResourceDependentFiles(
            folderFiles,
            true,
            shareProjectConnectedChats
          );

          if (!resolvedFolderFiles) return;

          resolvedFolderFiles.forEach((url) => resourceUrlsSet.add(url));
        }
      }

      return Array.from(resourceUrlsSet);
    },
    [getFilesRequest, getCsvFileDependentFiles, getProjectDependentFiles]
  );

  const getShareLink = useCallback(
    async (
      resources: {
        name: string;
        bucket: string;
        parentPath: string | null | undefined;
        nodeType: 'FOLDER' | 'ITEM';
      }[],
      options: {
        permissions: ResourcePermission[];
        shareConnectedChat?: boolean;
      }
    ): Promise<string | undefined> => {
      if (resources.length === 0) return;

      const resourcesUrls = await handleCollectResourceDependentFiles(
        resources,
        false,
        options.shareConnectedChat
      );

      if (!resourcesUrls) {
        displayToast('error', appMessages.shareLinkCreateError);

        return;
      }

      const shareLink = await shareFilesRequest({
        fileUrls: resourcesUrls,
        permissions: options.permissions,
      });

      if (!shareLink) {
        displayToast('error', appMessages.shareLinkCreateError);

        return;
      }

      const isSingleProjectSharing =
        resources.length === 1 &&
        resources[0].name.endsWith(dialProjectFileExtension);

      const invitationId = shareLink.slice(shareLink.lastIndexOf('/') + 1);
      let finalShareLink = '';

      if (isSingleProjectSharing) {
        const project = resources[0];
        finalShareLink = getProjectShareUrl({
          invitationId: invitationId,
          projectName: project.name.replaceAll(dialProjectFileExtension, ''),
          projectBucket: project.bucket,
          projectPath: project.parentPath,
        });
      } else {
        finalShareLink = getFilesShareUrl({
          invitationId: invitationId,
        });
      }

      return finalShareLink;
    },
    [handleCollectResourceDependentFiles, shareFilesRequest]
  );

  return {
    getShareLink,
  };
}
