import JSZip from 'jszip';
import { useCallback } from 'react';
import { AuthContextProps } from 'react-oidc-context';

import {
  ApiErrorType,
  apiMessages,
  ApiRequestFunctionWithError,
  CloneFileParams,
  CreateFileParams,
  CreateFileResult,
  emptyFileName,
  filesEndpointPrefix,
  GetFilesParams,
  MetadataNodeType,
  MetadataResourceType,
  ResourceMetadata,
} from '@frontend/common';

import { FileReference } from '../../common';
import { createUniqueFileName } from '../../services';
import {
  classifyFetchError,
  constructPath,
  displayToast,
  encodeApiUrl,
  triggerDownload,
} from '../../utils';
import { useBackendRequest } from './useBackendRequests';
import { useResourceRequests } from './useResourceRequests';

export const useFileResourceRequests = (
  auth: AuthContextProps,
  userBucket: string | undefined,
) => {
  const { sendDialRequest, sendRequestWithProgress } = useBackendRequest(auth);
  const { getResourceMetadata } = useResourceRequests(auth);

  const getFileBlob = useCallback<
    ApiRequestFunctionWithError<FileReference, Blob>
  >(
    async ({ name, bucket, parentPath }) => {
      try {
        const url = `${filesEndpointPrefix}/${encodeApiUrl(
          `${bucket}/${parentPath ? parentPath + '/' : ''}${name}`,
        )}`;
        const res = await sendDialRequest(url, { method: 'get' });

        if (!res.ok) {
          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.getFilesServer,
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: await res.blob(),
        };
      } catch (error) {
        return {
          success: false,
          error: classifyFetchError(error, apiMessages.getFilesClient),
        };
      }
    },
    [sendDialRequest],
  );

  const downloadFiles = useCallback<
    ApiRequestFunctionWithError<
      {
        files: FileReference[];
      },
      void
    >
  >(
    async ({ files }) => {
      try {
        if (files.length === 1) {
          const file = files[0];
          const fileBlob = await getFileBlob(file);

          if (!fileBlob.success) {
            displayToast('error', apiMessages.getFilesServer);

            return {
              success: false,
              error: fileBlob.error,
            };
          }

          const singleFile = new File([fileBlob.data], file.name);
          const fileUrl = window.URL.createObjectURL(singleFile);

          triggerDownload({
            fileUrl,
            fileName: file.name,
            successToast: {
              message: `File "${file.name}" is ready for download`,
              onClose: () => {
                window.URL.revokeObjectURL(fileUrl);
              },
            },
          });
        } else if (files.length > 1) {
          const zip = new JSZip();

          for (const file of files) {
            const fileBlob = await getFileBlob(file);

            if (fileBlob.success) {
              zip.file(file.name, fileBlob.data);
            } else {
              displayToast('error', apiMessages.getFilesServer);
            }
          }

          const content = await zip.generateAsync({ type: 'blob' });
          const zipFileName = `dial-xl-download-${new Date().toISOString()}.zip`;
          const zipFile = new File([content], zipFileName);
          const zipFileUrl = window.URL.createObjectURL(zipFile);

          triggerDownload({
            fileUrl: zipFileUrl,
            fileName: zipFileName,
            successToast: {
              message: `Archive with files is ready for download`,
              onClose: () => {
                window.URL.revokeObjectURL(zipFileUrl);
              },
            },
          });
        }

        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        displayToast('error', apiMessages.getFilesClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.getFilesClient),
        };
      }
    },
    [getFileBlob],
  );

  const getFiles = useCallback<
    ApiRequestFunctionWithError<GetFilesParams, ResourceMetadata[]>
  >(
    async ({ path, isRecursive = false, showErrors = false }) => {
      try {
        const fileMetadata = await getResourceMetadata({
          path,
          isRecursive,
          suppressErrors: true,
          withPermissions: true,
          resourceType: MetadataResourceType.FILE,
        });

        if (!fileMetadata.success) {
          if (showErrors) {
            displayToast('error', apiMessages.getFilesServer);
          }

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.getFilesServer,
            },
          };
        }

        return {
          success: true,
          data: fileMetadata.data.items ?? [],
        };
      } catch (error) {
        return {
          success: false,
          error: classifyFetchError(error, apiMessages.getFilesClient),
        };
      }
    },
    [getResourceMetadata],
  );

  const getUserFiles = useCallback<
    ApiRequestFunctionWithError<{ isRecursive?: boolean }, ResourceMetadata[]>
  >(
    async ({ isRecursive } = {}) => {
      if (!userBucket) {
        return {
          success: false,
          error: {
            type: ApiErrorType.Unknown,
            message: apiMessages.getFilesClient,
          },
        };
      }

      const files = await getFiles({ path: `${userBucket}/`, isRecursive });

      return files.success
        ? {
            success: true,
            data: files.data,
          }
        : {
            success: false,
            error: files.error,
          };
    },
    [getFiles, userBucket],
  );

  const createFile = useCallback<
    ApiRequestFunctionWithError<CreateFileParams, CreateFileResult>
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

        const res = await sendRequestWithProgress(
          window.externalEnv.dialBaseUrl!,
          encodeApiUrl(
            `${filesEndpointPrefix}/${bucket}/${
              path ? path + '/' : ''
            }${fileName}`,
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
          onProgress,
        );

        if (!res.ok) {
          if (res.status === 412) {
            displayToast('error', apiMessages.fileAlreadyExist);
          } else {
            displayToast('error', apiMessages.createFileServer);
          }

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message:
                res.status === 412
                  ? apiMessages.fileAlreadyExist
                  : apiMessages.createFileServer,
              statusCode: res.status,
            },
          };
        }

        const data: ResourceMetadata = await res.json();
        const etag = res.headers.get('Etag');

        return {
          success: true,
          data: { file: data, etag },
        };
      } catch (error) {
        displayToast('error', apiMessages.createFileClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.createFileClient),
        };
      }
    },
    [sendRequestWithProgress],
  );

  const createFolder = useCallback<
    ApiRequestFunctionWithError<
      FileReference & { suppressErrors?: boolean },
      void
    >
  >(
    async ({ bucket, parentPath = '', name, suppressErrors }) => {
      try {
        const result = await createFile({
          bucket,
          fileName: emptyFileName,
          forceCreation: true,
          path: constructPath([parentPath, name]),
        });

        if (!result.success && !suppressErrors) {
          displayToast('error', apiMessages.createFolderServer);
        }

        return result.success
          ? {
              success: true,
              data: undefined,
            }
          : {
              success: false,
              error: result.error,
            };
      } catch (error) {
        if (!suppressErrors) {
          displayToast('error', apiMessages.createFolderClient);
        }

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.createFolderClient),
        };
      }
    },
    [createFile],
  );

  const deleteFile = useCallback<
    ApiRequestFunctionWithError<
      {
        bucket: string;
        parentPath?: string | null;
        fileName: string;
        suppressErrors?: boolean;
      },
      void
    >
  >(
    async ({ bucket, parentPath = '', fileName, suppressErrors }) => {
      try {
        const res = await sendDialRequest(
          encodeApiUrl(
            `${filesEndpointPrefix}/${bucket}/${
              parentPath ? parentPath + '/' : ''
            }${fileName}`,
          ),
          {
            method: 'DELETE',
          },
        );

        if (!res.ok) {
          if (!suppressErrors) {
            if (res.status === 403) {
              displayToast('error', apiMessages.deleteFileForbidden);
            } else {
              displayToast('error', apiMessages.deleteFileServer);
            }
          }

          return {
            success: false,
            error: {
              type:
                res.status === 403
                  ? ApiErrorType.Unauthorized
                  : ApiErrorType.ServerError,
              message:
                res.status === 403
                  ? apiMessages.deleteFileForbidden
                  : apiMessages.deleteFileServer,
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        if (!suppressErrors) {
          displayToast('error', apiMessages.deleteFileClient);
        }

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.deleteFileClient),
        };
      }
    },
    [sendDialRequest],
  );

  const deleteFolder = useCallback<
    ApiRequestFunctionWithError<
      {
        bucket: string;
        parentPath: string | null | undefined;
        name: string;
        suppressErrors?: boolean;
      },
      void
    >
  >(
    async ({ bucket, parentPath = '', name, suppressErrors }) => {
      try {
        // Collect files inside folder
        const url = constructPath([bucket, parentPath, name]) + '/';
        const filesToDelete = await getFiles({
          path: url,
          isRecursive: true,
        });

        if (!filesToDelete.success) {
          if (suppressErrors) {
            return {
              success: true,
              data: undefined,
            };
          }

          displayToast('error', apiMessages.deleteFolderSomethingHappened);

          return {
            success: false,
            error: filesToDelete.error,
          };
        }

        const deleteRequests = filesToDelete.data.map(async (file) => {
          try {
            const fileUrl = encodeApiUrl(
              constructPath([
                filesEndpointPrefix,
                file.bucket,
                file.parentPath,
                file.name,
              ]),
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
            (result) => result.status === 'fulfilled' && result.value,
          )
        ) {
          return {
            success: true,
            data: undefined,
          };
        }

        return {
          success: false,
          error: {
            type: ApiErrorType.ServerError,
            message: apiMessages.deleteFolderSomethingHappened,
          },
        };
      } catch (error) {
        displayToast('error', apiMessages.deleteFolderSomethingHappened);

        return {
          success: false,
          error: classifyFetchError(
            error,
            apiMessages.deleteFolderSomethingHappened,
          ),
        };
      }
    },
    [getFiles, sendDialRequest],
  );

  const cloneFile = useCallback<
    ApiRequestFunctionWithError<FileReference & CloneFileParams, void>
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
        const allFilesInDestinationRes = await getFiles({
          path: folderPath,
        });

        const allFilesInDestination = allFilesInDestinationRes.success
          ? allFilesInDestinationRes.data
          : [];
        const fileNamesInDestination = allFilesInDestination
          .filter((f) => f.nodeType !== MetadataNodeType.FOLDER)
          .map((file) => file.name);
        const newFileName = newName || name;
        const targetFileName = fileNamesInDestination.includes(newFileName)
          ? createUniqueFileName(newFileName, fileNamesInDestination)
          : newFileName;

        const sourceUrl = encodeApiUrl(
          constructPath(['files', bucket, parentPath, name]),
        );
        const destinationUrl = encodeApiUrl(
          constructPath(['files', targetBucket, targetPath, targetFileName]),
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

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.cloneFileServer,
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        if (!suppressErrors) {
          displayToast('error', apiMessages.cloneFileClient);
        }

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.cloneFileClient),
        };
      }
    },
    [getFiles, sendDialRequest],
  );

  const renameFile = useCallback<
    ApiRequestFunctionWithError<
      {
        bucket: string;
        fileName: string;
        newFileName: string;
        parentPath: string | null | undefined;
      },
      void
    >
  >(
    async ({ bucket, fileName, newFileName, parentPath }) => {
      try {
        const sourceUrl = encodeApiUrl(
          constructPath(['files', bucket, parentPath, fileName]),
        );
        const destinationUrl = encodeApiUrl(
          constructPath(['files', bucket, parentPath, newFileName]),
        );

        const res = await sendDialRequest('/v1/ops/resource/move', {
          method: 'POST',
          body: JSON.stringify({
            sourceUrl,
            destinationUrl,
          }),
        });

        if (!res.ok) {
          displayToast('error', apiMessages.renameFileServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.renameFileServer,
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        displayToast('error', apiMessages.renameFileClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.renameFileClient),
        };
      }
    },
    [sendDialRequest],
  );

  const moveFile = useCallback<
    ApiRequestFunctionWithError<
      FileReference & {
        targetPath: string | null | undefined;
        targetBucket: string;
        suppressErrors?: boolean;
      },
      void
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
          constructPath(['files', bucket, parentPath, name]),
        );
        const destinationUrl = encodeApiUrl(
          constructPath(['files', targetBucket, targetPath, name]),
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

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.moveToFolderServer,
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        displayToast('error', apiMessages.moveToFolderClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.moveToFolderClient),
        };
      }
    },
    [sendDialRequest],
  );

  const moveFolder = useCallback<
    ApiRequestFunctionWithError<
      {
        bucket: string;
        parentPath: string | null | undefined;
        name: string;
        newName?: string;
        targetParentPath?: string;
        targetBucket?: string;
        suppressErrors?: boolean;
        onProgress?: (progress: number) => void;
      },
      void
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
      onProgress,
    }) => {
      try {
        onProgress?.(0);

        const url = constructPath([bucket, parentPath, name]) + '/';
        const filesInFolder = await getFiles({
          path: url,
          isRecursive: true,
        });

        onProgress?.(10);

        if (!filesInFolder.success) {
          if (suppressErrors) {
            return {
              success: true,
              data: undefined,
            };
          }

          displayToast('error', apiMessages.renameFileServer);

          return {
            success: false,
            error: filesInFolder.error,
          };
        }

        const sourceRootPath = constructPath([parentPath, name]);

        const totalFiles = filesInFolder.data.length;
        let currentFileIndex = 0;
        for (const file of filesInFolder.data) {
          const isFolderHiddenFile = file.name === emptyFileName;
          const relativeParentPath =
            file.parentPath && file.parentPath.startsWith(sourceRootPath)
              ? file.parentPath.slice(sourceRootPath.length).replace(/^\/+/, '')
              : '';
          const targetPathFull = constructPath([
            targetParentPath,
            newName,
            relativeParentPath,
          ]);

          if (!isFolderHiddenFile) {
            onProgress?.(20 + (currentFileIndex / totalFiles) * 80);
          }

          const moveRes = await moveFile({
            name: file.name,
            bucket: file.bucket,
            parentPath: file.parentPath,
            targetPath: targetPathFull,
            targetBucket: targetBucket,
            suppressErrors: isFolderHiddenFile,
          });

          currentFileIndex++;

          if (isFolderHiddenFile) continue;

          if (!moveRes.success) {
            if (suppressErrors) {
              return {
                success: true,
                data: undefined,
              };
            }

            displayToast('error', apiMessages.renameFileServer);

            return {
              success: false,
              error: moveRes.error,
            };
          }
        }

        onProgress?.(100);

        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        displayToast('error', apiMessages.renameFileClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.renameFileClient),
        };
      }
    },
    [getFiles, moveFile],
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
