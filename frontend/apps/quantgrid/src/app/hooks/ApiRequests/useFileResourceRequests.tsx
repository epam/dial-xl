import JSZip from 'jszip';
import { useCallback } from 'react';
import { AuthContextProps } from 'react-oidc-context';

import {
  apiMessages,
  emptyFileName,
  filesEndpointPrefix,
  MetadataNodeType,
  MetadataResourceType,
  ResourceMetadata,
} from '@frontend/common';

import { FileReference } from '../../common';
import { createUniqueFileName } from '../../services';
import { ApiRequestFunction } from '../../types';
import {
  constructPath,
  displayToast,
  encodeApiUrl,
  triggerDownload,
} from '../../utils';
import { useBackendRequest } from './useBackendRequests';
import { useResourceRequests } from './useResourceRequests';

export const useFileResourceRequests = (
  auth: AuthContextProps,
  userBucket: string | undefined
) => {
  const { sendDialRequest, sendDialRequestWithProgress } =
    useBackendRequest(auth);
  const { getResourceMetadata } = useResourceRequests(auth);

  const getFileBlob = useCallback<
    ApiRequestFunction<FileReference, Blob | undefined>
  >(
    async ({ name, bucket, parentPath }) => {
      try {
        const url = `${filesEndpointPrefix}/${encodeApiUrl(
          `${bucket}/${parentPath ? parentPath + '/' : ''}${name}`
        )}`;
        const res = await sendDialRequest(url, { method: 'get' });

        if (!res.ok) return undefined;

        return await res.blob();
      } catch {
        return undefined;
      }
    },
    [sendDialRequest]
  );

  const downloadFiles = useCallback<
    ApiRequestFunction<
      {
        files: FileReference[];
      },
      unknown
    >
  >(
    async ({ files }) => {
      try {
        if (files.length === 1) {
          const file = files[0];
          const fileBlob = await getFileBlob(file);

          if (!fileBlob) {
            displayToast('error', apiMessages.getFilesServer);

            return;
          }

          const singleFile = new File([fileBlob], file.name);
          const fileUrl = window.URL.createObjectURL(singleFile);

          triggerDownload(fileUrl, file.name);
        } else if (files.length > 1) {
          const zip = new JSZip();

          for (const file of files) {
            const fileBlob = await getFileBlob(file);

            if (fileBlob) {
              zip.file(file.name, fileBlob);
            } else {
              displayToast('error', apiMessages.getFilesServer);
            }
          }

          const content = await zip.generateAsync({ type: 'blob' });
          const zipFileName = `dial-xl-download-${new Date().toISOString()}.zip`;
          const zipFile = new File([content], zipFileName);
          const zipFileUrl = window.URL.createObjectURL(zipFile);

          triggerDownload(zipFileUrl, zipFileName);
        }

        return {};
      } catch {
        displayToast('error', apiMessages.getFilesClient);

        return;
      }
    },
    [getFileBlob]
  );

  const getFiles = useCallback<
    ApiRequestFunction<
      {
        path: string | null | undefined;
        isRecursive?: boolean;
        suppressErrors?: boolean;
      },
      ResourceMetadata[]
    >
  >(
    async ({ path, isRecursive = false, suppressErrors = false }) => {
      const fileMetadata = await getResourceMetadata({
        path,
        isRecursive,
        suppressErrors: true,
        withPermissions: true,
        resourceType: MetadataResourceType.FILE,
      });

      if (!fileMetadata && !suppressErrors) {
        displayToast('error', apiMessages.getFilesServer);
      }

      return fileMetadata?.items ?? [];
    },
    [getResourceMetadata]
  );

  const getUserFiles = useCallback<
    ApiRequestFunction<{ isRecursive?: boolean }, ResourceMetadata[]>
  >(
    async ({ isRecursive } = {}) => {
      if (!userBucket) return;

      return await getFiles({ path: `${userBucket}/`, isRecursive });
    },
    [getFiles, userBucket]
  );

  const createFile = useCallback<
    ApiRequestFunction<
      {
        bucket: string;
        path?: string | null;
        fileName: string;
        forceCreation?: boolean;
        fileBlob?: File;
        onProgress?: (
          progress: number,
          event: ProgressEvent<EventTarget>
        ) => void;
        fileType?: string; // Needed if file blob omitted
        fileData?: string; // Needed if file blob omitted
      },
      { file: ResourceMetadata; etag: string | null }
    >
  >(
    async ({
      bucket,
      path = '',
      fileName,
      forceCreation,
      fileBlob,
      onProgress,
      fileType,
      fileData = '',
    }) => {
      try {
        let file = fileBlob;

        if (!file) {
          file = new File([fileData], fileName, {
            type: fileType,
          });
        }
        const formData = new FormData();
        formData.append('attachment', file);

        const res = await sendDialRequestWithProgress(
          encodeApiUrl(
            `${filesEndpointPrefix}/${bucket}/${
              path ? path + '/' : ''
            }${fileName}`
          ),
          {
            method: 'PUT',
            body: formData,
            headers: !forceCreation
              ? {
                  'If-None-Match': '*', // Needed to not override existing file if already exists
                }
              : {},
          },
          onProgress
        );

        if (!res.ok) {
          if (res.status === 412) {
            displayToast('error', apiMessages.fileAlreadyExist);
          } else {
            displayToast('error', apiMessages.createFileServer);
          }

          return;
        }

        const data: ResourceMetadata = await res.json();
        const etag = res.headers.get('Etag');

        return { file: data, etag };
      } catch {
        displayToast('error', apiMessages.createFileClient);

        return undefined;
      }
    },
    [sendDialRequestWithProgress]
  );

  const createFolder = useCallback<
    ApiRequestFunction<FileReference & { suppressErrors?: boolean }, unknown>
  >(
    async ({ bucket, parentPath = '', name, suppressErrors }) => {
      try {
        const result = await createFile({
          bucket,
          fileName: emptyFileName,
          forceCreation: true,
          path: constructPath([parentPath, name]),
        });

        if (!result?.file && !suppressErrors) {
          displayToast('error', apiMessages.createFolderServer);
        }

        return {};
      } catch {
        if (!suppressErrors) {
          displayToast('error', apiMessages.createFolderClient);
        }

        return undefined;
      }
    },
    [createFile]
  );

  const deleteFile = useCallback<
    ApiRequestFunction<
      {
        bucket: string;
        parentPath?: string | null;
        fileName: string;
        suppressErrors?: boolean;
      },
      unknown
    >
  >(
    async ({ bucket, parentPath = '', fileName, suppressErrors }) => {
      try {
        const res = await sendDialRequest(
          encodeApiUrl(
            `${filesEndpointPrefix}/${bucket}/${
              parentPath ? parentPath + '/' : ''
            }${fileName}`
          ),
          {
            method: 'DELETE',
          }
        );

        if (!res.ok) {
          if (!suppressErrors) {
            if (res.status === 403) {
              displayToast('error', apiMessages.deleteFileForbidden);
            } else {
              displayToast('error', apiMessages.deleteFileServer);
            }
          }

          return;
        }

        return {};
      } catch {
        if (!suppressErrors) {
          displayToast('error', apiMessages.deleteFileClient);
        }

        return undefined;
      }
    },
    [sendDialRequest]
  );

  const deleteFolder = useCallback<
    ApiRequestFunction<
      {
        bucket: string;
        parentPath: string | null | undefined;
        name: string;
        suppressErrors?: boolean;
      },
      unknown
    >
  >(
    async ({ bucket, parentPath = '', name, suppressErrors }) => {
      try {
        // Collect files inside folder
        const url = constructPath([bucket, parentPath, name]) + '/';
        const filesToDelete = await getFiles({
          path: url,
          isRecursive: true,
          suppressErrors: true,
        });

        if (!filesToDelete) {
          if (suppressErrors) return {};

          displayToast('error', apiMessages.deleteFolderSomethingHappened);

          return;
        }

        const deleteRequests = filesToDelete.map(async (file) => {
          try {
            const fileUrl = encodeApiUrl(
              constructPath([
                filesEndpointPrefix,
                file.bucket,
                file.parentPath,
                file.name,
              ])
            );
            const res = await sendDialRequest(fileUrl, {
              method: 'DELETE',
            });

            if (!res.ok) {
              if (res.status === 403) {
                displayToast('error', apiMessages.deleteFileForbidden);
              } else {
                displayToast('error', apiMessages.deleteFileServer);
              }

              return;
            }

            return {};
          } catch {
            displayToast('error', apiMessages.deleteFileClient);

            return;
          }
        });

        const results = await Promise.allSettled(deleteRequests);

        if (
          results.every(
            (result) => result.status === 'fulfilled' && result.value
          )
        ) {
          return {};
        }

        return undefined;
      } catch {
        displayToast('error', apiMessages.deleteFolderSomethingHappened);

        return undefined;
      }
    },
    [getFiles, sendDialRequest]
  );

  const cloneFile = useCallback<
    ApiRequestFunction<
      FileReference & {
        targetPath: string | null;
        targetBucket: string;
        suppressErrors?: boolean;
        newName?: string;
      },
      unknown
    >
  >(
    async ({
      bucket,
      name,
      parentPath,
      targetPath,
      targetBucket,
      suppressErrors = false,
      newName,
    }) => {
      try {
        const folderPath = `${targetBucket}/${
          targetPath ? targetPath + '/' : ''
        }`;
        const allFilesInDestination = await getFiles({
          path: folderPath,
          suppressErrors: true,
        });

        const fileNamesInDestination = (allFilesInDestination ?? [])
          .filter((f) => f.nodeType !== MetadataNodeType.FOLDER)
          .map((file) => file.name);
        const newFileName = newName || name;
        const targetFileName = fileNamesInDestination.includes(newFileName)
          ? createUniqueFileName(newFileName, fileNamesInDestination)
          : newFileName;

        const sourceUrl = encodeApiUrl(
          constructPath(['files', bucket, parentPath, name])
        );
        const destinationUrl = encodeApiUrl(
          constructPath(['files', targetBucket, targetPath, targetFileName])
        );

        const res = await sendDialRequest('/v1/ops/resource/copy', {
          method: 'POST',
          body: JSON.stringify({
            sourceUrl,
            destinationUrl,
          }),
        });

        if (!res.ok) {
          if (!suppressErrors) {
            displayToast('error', apiMessages.cloneFileServer);
          }

          return undefined;
        }

        return {};
      } catch {
        if (!suppressErrors) {
          displayToast('error', apiMessages.cloneFileClient);
        }

        return;
      }
    },
    [getFiles, sendDialRequest]
  );

  const renameFile = useCallback<
    ApiRequestFunction<
      {
        bucket: string;
        fileName: string;
        newFileName: string;
        parentPath: string | null | undefined;
      },
      unknown
    >
  >(
    async ({ bucket, fileName, newFileName, parentPath }) => {
      try {
        const sourceUrl = encodeApiUrl(
          constructPath(['files', bucket, parentPath, fileName])
        );
        const destinationUrl = encodeApiUrl(
          constructPath(['files', bucket, parentPath, newFileName])
        );

        const res = await sendDialRequest('/v1/ops/resource/move', {
          method: 'POST',
          body: JSON.stringify({
            sourceUrl,
            destinationUrl,
          }),
        });

        if (!res) {
          displayToast('error', apiMessages.renameFileServer);

          return undefined;
        }

        return {};
      } catch {
        displayToast('error', apiMessages.renameFileClient);

        return;
      }
    },
    [sendDialRequest]
  );

  const moveFile = useCallback<
    ApiRequestFunction<
      FileReference & {
        targetPath: string | null | undefined;
        targetBucket: string;
        suppressErrors?: boolean;
      },
      unknown
    >
  >(
    async ({
      name,
      bucket,
      parentPath,
      targetPath,
      targetBucket,
      suppressErrors,
    }) => {
      try {
        const sourceUrl = encodeApiUrl(
          constructPath(['files', bucket, parentPath, name])
        );
        const destinationUrl = encodeApiUrl(
          constructPath(['files', targetBucket, targetPath, name])
        );

        const res = await sendDialRequest('/v1/ops/resource/move', {
          method: 'POST',
          body: JSON.stringify({
            sourceUrl,
            destinationUrl,
          }),
        });

        if (!res.ok) {
          if (!suppressErrors) {
            displayToast('error', apiMessages.moveToFolderServer);
          }

          return undefined;
        }

        return {};
      } catch {
        displayToast('error', apiMessages.moveToFolderClient);

        return undefined;
      }
    },
    [sendDialRequest]
  );

  const moveFolder = useCallback<
    ApiRequestFunction<
      {
        bucket: string;
        parentPath: string | null | undefined;
        name: string;
        newName?: string;
        targetParentPath?: string;
        targetBucket?: string;
        suppressErrors?: boolean;
      },
      unknown
    >
  >(
    async ({
      bucket,
      parentPath = '',
      name,
      newName = name,
      targetParentPath = parentPath,
      targetBucket = bucket,
      suppressErrors,
    }) => {
      try {
        const url = constructPath([bucket, parentPath, name]) + '/';
        const filesInFolder = await getFiles({
          path: url,
          isRecursive: true,
          suppressErrors: true,
        });

        if (!filesInFolder) {
          if (suppressErrors) return {};

          displayToast('error', apiMessages.renameFileServer);

          return;
        }

        for (const file of filesInFolder) {
          const isFolderHiddenFile = file.name === emptyFileName;
          const moveRes = await moveFile({
            name: file.name,
            bucket: file.bucket,
            parentPath: file.parentPath,
            targetPath: constructPath([targetParentPath, newName]),
            targetBucket: targetBucket,
            suppressErrors: isFolderHiddenFile,
          });

          if (isFolderHiddenFile) continue;

          if (!moveRes) {
            if (suppressErrors) return {};

            displayToast('error', apiMessages.renameFileServer);

            return;
          }
        }

        return {};
      } catch {
        displayToast('error', apiMessages.renameFileClient);

        return undefined;
      }
    },
    [getFiles, moveFile]
  );

  return {
    downloadFiles,
    getFiles,
    getUserFiles,
    createFolder,
    createFile,
    deleteFile,
    deleteFolder,
    cloneFile,
    renameFile,
    moveFile,
    moveFolder,
  };
};
