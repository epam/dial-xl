import JSZip from 'jszip';
import { useCallback, useContext } from 'react';
import { useAuth } from 'react-oidc-context';
import { parse as yamlParse, stringify as yamlStringify } from 'yaml';

import {
  AIHint,
  apiMessages,
  CompileRequest,
  dialAIHintsFileName,
  dialProjectFileExtension,
  DimensionalSchemaRequest,
  DimensionalSchemaResponse,
  DownloadRequest,
  emptyFileName,
  filesEndpointPrefix,
  FilesMetadata,
  FunctionInfo,
  FunctionsRequest,
  FunctionsResponse,
  NotificationRequest,
  projectFoldersRootPrefix,
  ProjectState,
  QGDialProject,
  ResourcePermission,
  Viewport,
  ViewportRequest,
  WorksheetState,
} from '@frontend/common';

import { FileReference } from '../common';
import { ApiContext, defaultSheetName } from '../context';
import { createUniqueFileName, getApiUrl } from '../services';
import {
  collectFilesFromProject,
  constructPath,
  decodeApiUrl,
  displayToast,
  encodeApiUrl,
  mapProjectToQGDialProject,
  mapQGDialProjectToProject,
  triggerDownload,
  updateFilesPathInputsInProject,
} from '../utils';

type ApiRequestFunction<T, K> = (params: T) => Promise<K | undefined>;

// Hook just for getting data, but handling data will be on calling side
export const useApiRequests = () => {
  const { userBucket } = useContext(ApiContext);

  const auth = useAuth();

  const sendAuthorizedRequest = useCallback(
    (
      path: string,
      params?: Omit<RequestInit, 'headers'> & {
        headers?: Record<string, string>;
      }
    ) => {
      const headers = params?.headers || {};

      if (auth.user?.access_token) {
        headers['Authorization'] = `Bearer ${auth.user?.access_token}`;
      }

      const pathWithApiUrl = getApiUrl() + path;

      return fetch(pathWithApiUrl, { ...params, headers });
    },
    [auth]
  );

  const sendDialRequest = useCallback(
    (
      path: string,
      params?: Omit<RequestInit, 'headers'> & {
        headers?: Record<string, string>;
      }
    ) => {
      const headers = params?.headers || {};

      if (auth.user?.access_token) {
        headers['Authorization'] = `Bearer ${auth.user?.access_token}`;
      }

      const fullPath = window.externalEnv.dialBaseUrl + path;

      return fetch(fullPath, { ...params, headers });
    },
    [auth]
  );

  const getFileBlob = useCallback<
    ApiRequestFunction<FileReference, Blob | undefined>
  >(
    async ({ name, bucket, path }) => {
      try {
        const url = `${filesEndpointPrefix}/${encodeApiUrl(
          `${bucket}/${path ? path + '/' : ''}${name}`
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
      } catch (e) {
        displayToast('error', apiMessages.getFilesClient);

        return;
      }
    },
    [getFileBlob]
  );

  const getResourceMetadata = useCallback<
    ApiRequestFunction<
      {
        path: string | null | undefined;
        isRecursive?: boolean;
        suppressErrors?: boolean;
        withPermissions?: boolean;
      },
      FilesMetadata
    >
  >(
    async ({
      path,
      isRecursive = false,
      suppressErrors = false,
      withPermissions = false,
    }) => {
      try {
        let finalItems: FilesMetadata[] = [];
        let filesMetadata: FilesMetadata | undefined;
        let currentNextToken: string | undefined;

        do {
          const searchParams = new URLSearchParams({
            limit: '1000',
            ...(isRecursive
              ? {
                  recursive: 'true',
                }
              : undefined),
            ...(currentNextToken
              ? {
                  token: currentNextToken,
                }
              : undefined),
            ...(withPermissions
              ? {
                  permissions: 'true',
                }
              : undefined),
          });
          const url = `/v1/metadata/files/${encodeApiUrl(
            path ?? ''
          )}?${searchParams.toString()}`;
          currentNextToken = undefined;
          const res = await sendDialRequest(url, { method: 'get' });

          if (!res.ok) {
            if (!suppressErrors) {
              displayToast('error', apiMessages.getFilesServer);
            }

            return undefined;
          }

          filesMetadata = await res.json();

          if (filesMetadata) {
            finalItems = finalItems.concat(filesMetadata.items ?? []);
            currentNextToken = filesMetadata.nextToken;
          }
        } while (currentNextToken);

        if (!filesMetadata) return;

        return {
          ...filesMetadata,
          items: finalItems,
        };
      } catch (e) {
        if (!suppressErrors) {
          displayToast('error', apiMessages.getFilesClient);
        }

        return;
      }
    },
    [sendDialRequest]
  );

  const getFiles = useCallback<
    ApiRequestFunction<
      {
        path: string | null | undefined;
        isRecursive?: boolean;
        suppressErrors?: boolean;
      },
      FilesMetadata[]
    >
  >(
    async ({ path, isRecursive = false, suppressErrors = false }) => {
      const fileMetadata = await getResourceMetadata({
        path,
        isRecursive,
        suppressErrors: true,
      });

      if (!fileMetadata && !suppressErrors) {
        displayToast('error', apiMessages.getFilesServer);
      }

      return fileMetadata?.items;
    },
    [getResourceMetadata]
  );

  const getSharedByMeFiles = useCallback<
    ApiRequestFunction<void, FilesMetadata[]>
  >(async () => {
    try {
      const url = `/v1/ops/resource/share/list`;
      const res = await sendDialRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          resourceTypes: ['FILE'],
          with: 'others',
        }),
      });

      if (!res.ok) {
        displayToast('error', apiMessages.getSharedByMeFilesServer);

        return undefined;
      }

      const filesMetadata: { resources: FilesMetadata[] } = await res.json();

      return filesMetadata.resources;
    } catch (e) {
      displayToast('error', apiMessages.getSharedByMeFilesClient);

      return;
    }
  }, [sendDialRequest]);

  const getSharedWithMeFiles = useCallback<
    ApiRequestFunction<void, FilesMetadata[]>
  >(async () => {
    try {
      const url = `/v1/ops/resource/share/list`;
      const res = await sendDialRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          resourceTypes: ['FILE'],
          with: 'me',
        }),
      });

      if (!res.ok) {
        displayToast('error', apiMessages.getSharedWithMeFilesServer);

        return undefined;
      }

      const filesMetadata: { resources: FilesMetadata[] } = await res.json();

      return filesMetadata.resources;
    } catch (e) {
      displayToast('error', apiMessages.getSharedWithMeFilesClient);

      return;
    }
  }, [sendDialRequest]);

  const getFlatUserProjects = useCallback<
    ApiRequestFunction<void, FilesMetadata[]>
  >(async () => {
    if (!userBucket) return;

    const files = await getFiles({
      path: `${userBucket}/`,
      isRecursive: true,
    });

    if (!files) return files;

    const flatFiles = (
      files: FilesMetadata[],
      acc: FilesMetadata[]
    ): FilesMetadata[] =>
      files.reduce((acc, curr) => {
        if (
          curr.nodeType === 'ITEM' &&
          curr.name.endsWith(dialProjectFileExtension)
        ) {
          acc.push(curr);
        }

        if (curr.items?.length) {
          acc.push(...flatFiles(curr.items, acc));
        }

        return acc;
      }, acc);

    const flattedFiles = flatFiles(files, [] as FilesMetadata[]);

    return flattedFiles;
  }, [getFiles, userBucket]);

  const getBucket = useCallback<ApiRequestFunction<void, string>>(async () => {
    try {
      const res = await sendDialRequest(`/v1/bucket`);

      if (!res.ok) {
        displayToast('error', apiMessages.getBucketServer);

        return undefined;
      }

      const data: { bucket: string } = await res.json();

      return data.bucket;
    } catch {
      displayToast('error', apiMessages.getBucketClient);

      return;
    }
  }, [sendDialRequest]);

  const getUserFiles = useCallback<
    ApiRequestFunction<void, FilesMetadata[]>
  >(async () => {
    if (!userBucket) return;

    return await getFiles({ path: `${userBucket}/` });
  }, [getFiles, userBucket]);

  const createFile = useCallback<
    ApiRequestFunction<
      {
        bucket: string;
        path?: string | null;
        fileName: string;
        forceCreation?: boolean;
        fileBlob?: File;
        fileType?: string; // Needed if file blob omitted
        fileData?: string; // Needed if file blob omitted
      },
      { file: FilesMetadata; etag: string | null }
    >
  >(
    async ({
      bucket,
      path = '',
      fileName,
      forceCreation,
      fileBlob,
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

        const res = await sendDialRequest(
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
          }
        );

        if (!res.ok) {
          if (res.status === 412) {
            displayToast('error', apiMessages.fileAlreadyExist);
          } else {
            displayToast('error', apiMessages.createFileServer);
          }

          return;
        }

        const data: FilesMetadata = await res.json();
        const etag = res.headers.get('Etag');

        return { file: data, etag };
      } catch {
        displayToast('error', apiMessages.createFileClient);
      }
    },
    [sendDialRequest]
  );

  const createFolder = useCallback<
    ApiRequestFunction<FileReference & { suppressErrors?: boolean }, unknown>
  >(
    async ({ bucket, path = '', name, suppressErrors }) => {
      try {
        const result = await createFile({
          bucket,
          fileName: emptyFileName,
          forceCreation: true,
          path: constructPath([path, name]),
        });

        if (!result?.file && !suppressErrors) {
          displayToast('error', apiMessages.createFolderServer);
        }

        return {};
      } catch {
        if (!suppressErrors) {
          displayToast('error', apiMessages.createFolderClient);
        }
      }
    },
    [createFile]
  );

  const deleteFile = useCallback<
    ApiRequestFunction<
      {
        bucket: string;
        path?: string | null;
        fileName: string;
      },
      unknown
    >
  >(
    async ({ bucket, path = '', fileName }) => {
      try {
        const res = await sendDialRequest(
          encodeApiUrl(
            `${filesEndpointPrefix}/${bucket}/${
              path ? path + '/' : ''
            }${fileName}`
          ),
          {
            method: 'DELETE',
          }
        );

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
      } catch {
        displayToast('error', apiMessages.deleteFolderSomethingHappened);
      }
    },
    [getFiles, sendDialRequest]
  );

  const createProject = useCallback<
    ApiRequestFunction<
      {
        bucket: string;
        path?: string | null;
        projectName: string;
        initialProjectData?: QGDialProject;
        skipFolderCreation?: boolean;
        forceCreation?: boolean;
      },
      ProjectState
    >
  >(
    async ({
      bucket,
      path = '',
      projectName,
      initialProjectData,
      skipFolderCreation,
      forceCreation,
    }) => {
      const newProjectData: QGDialProject = initialProjectData ?? {
        [defaultSheetName]: '',
      };

      const data = await createFile({
        bucket,
        path,
        fileName: `${projectName}${dialProjectFileExtension}`,
        forceCreation,
        fileType: 'application/x-yaml',
        fileData: yamlStringify(newProjectData),
      });

      if (!data) return;

      if (!skipFolderCreation) {
        await createFolder({
          bucket,
          name: projectName,
          path: constructPath([projectFoldersRootPrefix, path]),
          suppressErrors: true,
        });
      }

      return {
        bucket,
        path,
        projectName,
        settings: {},
        sheets: Object.entries(newProjectData).reduce(
          (acc, [sheetName, sheetContent]) => {
            acc.push({
              sheetName,
              content: sheetContent,
              projectName,
            });

            return acc;
          },
          [] as WorksheetState[]
        ),
        version: data?.etag ?? '',
      };
    },
    [createFile, createFolder]
  );

  const getAIHintsContent = useCallback<
    ApiRequestFunction<
      Pick<FileReference, 'bucket' | 'path'> & { suppressErrors?: boolean },
      { json: AIHint[]; version: string }
    >
  >(
    async ({ bucket, path = '', suppressErrors = false }) => {
      try {
        const res = await sendDialRequest(
          encodeApiUrl(
            constructPath([
              filesEndpointPrefix,
              bucket,
              path,
              dialAIHintsFileName,
            ])
          )
        );

        if (!res.ok) {
          if (!suppressErrors) {
            displayToast('error', apiMessages.getAIHintsServer);
          }

          return;
        }

        const result = await res.json();
        const version = res.headers.get('Etag') ?? '';

        return { json: result, version };
      } catch {
        if (!suppressErrors) {
          displayToast('error', apiMessages.getAIHintsClient);
        }
      }
    },
    [sendDialRequest]
  );

  const putAIHintsContent = useCallback<
    ApiRequestFunction<
      Pick<FileReference, 'bucket' | 'path'> & {
        hints: AIHint[];
        version?: string;
      },
      { version: string }
    >
  >(
    async ({ bucket, path = '', hints, version }) => {
      try {
        const data = JSON.stringify(hints);
        const file = new File([data], dialAIHintsFileName, {
          type: 'application/json',
        });
        const formData = new FormData();
        formData.append('attachment', file);

        const res = await sendDialRequest(
          encodeApiUrl(
            `${filesEndpointPrefix}/${bucket}/${
              path ? path + '/' : ''
            }${dialAIHintsFileName}`
          ),
          {
            method: 'PUT',
            body: formData,
            headers: version
              ? {
                  'If-Match': version,
                }
              : undefined,
          }
        );

        if (!res.ok) {
          if (res.status === 412) {
            displayToast('error', apiMessages.putAIHintsVersion);
          } else if (res.status === 403) {
            displayToast('error', apiMessages.putAIHintsForbidden);
          } else {
            displayToast('error', apiMessages.putAIHintsServer);
          }

          return;
        }
        const resultVersion = res.headers.get('Etag') ?? '';

        return {
          version: resultVersion,
        };
      } catch {
        displayToast('error', apiMessages.putAIHintsClient);
      }
    },
    [sendDialRequest]
  );

  const getProject = useCallback<
    ApiRequestFunction<FileReference, ProjectState>
  >(
    async ({ bucket, path = '', name }) => {
      try {
        const res = await sendDialRequest(
          encodeApiUrl(
            constructPath([
              filesEndpointPrefix,
              bucket,
              path,
              name + dialProjectFileExtension,
            ])
          )
        );

        if (!res.ok) {
          displayToast('error', apiMessages.getProjectServer);

          return;
        }

        const text = await res.text();
        const data: QGDialProject = yamlParse(text);
        const version = res.headers.get('Etag') ?? '';

        return mapQGDialProjectToProject(data, name, bucket, path, version);
      } catch {
        displayToast('error', apiMessages.getProjectClient);
      }
    },
    [sendDialRequest]
  );

  const putProject = useCallback<
    ApiRequestFunction<ProjectState, ProjectState>
  >(
    async (projectData) => {
      try {
        const mappedData = mapProjectToQGDialProject(projectData);
        const yamlData = yamlStringify(mappedData);
        const file = new File(
          [yamlData],
          projectData.projectName + dialProjectFileExtension,
          {
            type: 'application/x-yaml',
          }
        );
        const formData = new FormData();
        formData.append('attachment', file);

        const res = await sendDialRequest(
          encodeApiUrl(
            `${filesEndpointPrefix}/${projectData.bucket}/${
              projectData.path ? projectData.path + '/' : ''
            }${projectData.projectName}${dialProjectFileExtension}`
          ),
          {
            method: 'PUT',
            body: formData,
            headers: projectData.version
              ? {
                  'If-Match': projectData.version,
                }
              : undefined,
          }
        );

        if (!res.ok) {
          if (res.status === 412) {
            displayToast('error', apiMessages.putProjectVersion);
          } else if (res.status === 403) {
            displayToast('error', apiMessages.putProjectForbidden);
          } else {
            displayToast('error', apiMessages.putProjectServer);
          }

          return;
        }
        const version = res.headers.get('Etag') ?? '';

        return {
          ...projectData,
          version,
        };
      } catch {
        displayToast('error', apiMessages.putProjectClient);
      }
    },
    [sendDialRequest]
  );

  const deleteProject = useCallback<
    ApiRequestFunction<FileReference, unknown | undefined>
  >(
    async ({ bucket, path = '', name }) => {
      try {
        // TODO: check escaping
        const res = await sendDialRequest(
          encodeApiUrl(
            `${filesEndpointPrefix}/${bucket}/${
              path ? path + '/' : ''
            }${name}${dialProjectFileExtension}`
          ),
          {
            method: 'DELETE',
          }
        );

        if (!res.ok) {
          if (res.status === 403) {
            displayToast('error', apiMessages.deleteProjectForbidden);
          } else {
            displayToast('error', apiMessages.deleteProjectServer);
          }

          return;
        }

        const deleteFolderRes = await deleteFolder({
          bucket,
          parentPath: `${projectFoldersRootPrefix}/${
            path ? path + '/' : ''
          }${name}`,
          name: '',
          suppressErrors: true,
        });

        if (!deleteFolderRes) return;

        return {};
      } catch {
        displayToast('error', apiMessages.deleteProjectClient);
      }
    },
    [deleteFolder, sendDialRequest]
  );

  const shareFiles = useCallback<
    ApiRequestFunction<
      {
        fileUrls: string[];
        permissions: ResourcePermission[];
      },
      string
    >
  >(
    async ({ fileUrls, permissions }) => {
      try {
        const url = `/v1/ops/resource/share/create`;
        const res = await sendDialRequest(url, {
          method: 'POST',
          body: JSON.stringify({
            resources: [
              ...fileUrls.map((url) => ({
                url,
                permissions,
              })),
            ],
            invitationType: 'link',
          }),
        });

        if (!res.ok) {
          displayToast('error', apiMessages.shareProjectServer);

          return undefined;
        }

        const data: { invitationLink: string } = await res.json();

        return data.invitationLink;
      } catch (e) {
        displayToast('error', apiMessages.shareProjectClient);

        return;
      }
    },
    [sendDialRequest]
  );

  const revokeResourcesAccess = useCallback<
    ApiRequestFunction<
      (FileReference & { nodeType: 'FOLDER' | 'ITEM' })[],
      boolean
    >
  >(
    async (files) => {
      try {
        const url = `/v1/ops/resource/share/revoke`;
        const res = await sendDialRequest(url, {
          method: 'POST',
          body: JSON.stringify({
            resources: files.map(({ bucket, path, name, nodeType }) => ({
              url: encodeApiUrl(
                constructPath(['files', bucket, path, name]) +
                  (nodeType === 'FOLDER' ? '/' : '')
              ),
            })),
          }),
        });

        if (!res.ok) {
          displayToast('error', apiMessages.revokeResourceServer);

          return;
        }

        return true;
      } catch (e) {
        displayToast('error', apiMessages.revokeResourceClient);

        return;
      }
    },
    [sendDialRequest]
  );

  const discardResourcesAccess = useCallback<
    ApiRequestFunction<
      (FileReference & { nodeType: 'FOLDER' | 'ITEM' })[],
      boolean
    >
  >(
    async (files) => {
      try {
        const url = `/v1/ops/resource/share/discard`;
        const res = await sendDialRequest(url, {
          method: 'POST',
          body: JSON.stringify({
            resources: files.map(({ bucket, path, name, nodeType }) => ({
              url: encodeApiUrl(
                constructPath(['files', bucket, path, name]) +
                  (nodeType === 'FOLDER' ? '/' : '')
              ),
            })),
          }),
        });

        if (!res.ok) {
          displayToast('error', apiMessages.discardResourceServer);

          return;
        }

        return true;
      } catch (e) {
        displayToast('error', apiMessages.discardResourceClient);

        return;
      }
    },
    [sendDialRequest]
  );

  const acceptShare = useCallback<
    ApiRequestFunction<{ invitationId: string }, unknown>
  >(
    async ({ invitationId }) => {
      try {
        const url = `/v1/invitations/${invitationId}?accept=true`;
        const res = await sendDialRequest(url, {
          method: 'GET',
        });

        if (!res.ok) {
          displayToast('error', apiMessages.acceptShareProjectServer);

          return undefined;
        }

        return {};
      } catch (e) {
        displayToast('error', apiMessages.acceptShareProjectClient);

        return;
      }
    },
    [sendDialRequest]
  );

  const cloneFile = useCallback<
    ApiRequestFunction<
      FileReference & {
        targetPath: string | null;
        targetBucket: string;
        suppressErrors?: boolean;
      },
      unknown
    >
  >(
    async ({
      bucket,
      name,
      path,
      targetPath,
      targetBucket,
      suppressErrors = false,
    }) => {
      try {
        const folderPath = `${targetBucket}/${
          targetPath ? targetPath + '/' : ''
        }`;
        const allFilesInDestination = await getFiles({
          path: folderPath,
          suppressErrors: true,
        });

        const fileBlob = await getFileBlob({ name, bucket, path });

        if (!fileBlob) {
          if (!suppressErrors) {
            displayToast('error', apiMessages.cloneFileServer);
          }

          return undefined;
        }

        const file = new File([fileBlob], name);

        const fileNamesInDestination = (allFilesInDestination ?? [])
          .filter((f) => f.nodeType !== 'FOLDER')
          .map((file) => file.name);
        const targetFileName = fileNamesInDestination.includes(name)
          ? createUniqueFileName(name, fileNamesInDestination)
          : name;

        const data = await createFile({
          bucket: targetBucket,
          path: targetPath,
          fileName: targetFileName,
          fileType: file.type,
          fileBlob: file,
        });

        if (!data) return;

        return {};
      } catch (e) {
        if (!suppressErrors) {
          displayToast('error', apiMessages.cloneFileClient);
        }

        return;
      }
    },
    [createFile, getFileBlob, getFiles]
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
      } catch (e) {
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
      path,
      targetPath,
      targetBucket,
      suppressErrors,
    }) => {
      try {
        const sourceUrl = encodeApiUrl(
          constructPath(['files', bucket, path, name])
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
            path: file.parentPath,
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
      }
    },
    [getFiles, moveFile]
  );

  const moveProject = useCallback<
    ApiRequestFunction<
      Pick<FileReference, 'name' | 'bucket' | 'path'> & {
        targetPath: string | null | undefined;
        targetBucket: string;
        newProjectName?: string;
        suppressErrors?: boolean;
      },
      unknown
    >
  >(
    async ({
      name,
      newProjectName: newProjectNameParam,
      bucket,
      path,
      targetPath,
      targetBucket,
      suppressErrors,
    }) => {
      try {
        const projectName = name.replace(dialProjectFileExtension, '');
        const newProjectName = newProjectNameParam ?? projectName;

        // 1. Get project and update it's content
        const project = await getProject({
          name: projectName,
          bucket,
          path,
        });

        if (!project) {
          displayToast('error', apiMessages.moveToFolderServer);

          return undefined;
        }

        const updatedProjectSheets = updateFilesPathInputsInProject(
          project.sheets,
          constructPath([bucket, projectFoldersRootPrefix, path, projectName]),
          constructPath([
            targetBucket,
            projectFoldersRootPrefix,
            targetPath,
            newProjectName,
          ])
        );

        // 2. Create project with updated content
        const createdProjectRes = await createProject({
          projectName: newProjectName,
          bucket: targetBucket,
          path: targetPath,
          initialProjectData: updatedProjectSheets.reduce((acc, curr) => {
            acc[curr.sheetName] = curr.content;

            return acc;
          }, {} as Record<string, string>),
          skipFolderCreation: true,
        });

        if (!createdProjectRes) {
          displayToast('error', apiMessages.moveToFolderServer);

          return undefined;
        }

        // 3. Delete the original project
        const deleteProjectRes = await deleteFile({
          fileName: name,
          bucket,
          path,
        });

        if (!deleteProjectRes) {
          displayToast('error', apiMessages.moveToFolderServer);

          return undefined;
        }

        // 4. Move related files
        const projectFiles = await moveFolder({
          bucket,
          parentPath: constructPath([projectFoldersRootPrefix, path]),
          name: projectName,
          newName: newProjectName,
          targetBucket,
          targetParentPath: constructPath([
            projectFoldersRootPrefix,
            targetPath,
          ]),
        });

        if (!projectFiles) {
          if (suppressErrors) return {};

          displayToast('error', apiMessages.moveToFolderServer);
        }

        return {};
      } catch {
        displayToast('error', apiMessages.moveToFolderClient);
      }
    },
    [createProject, deleteFile, getProject, moveFolder]
  );

  const renameProject = useCallback<
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
      return moveProject({
        bucket,
        name: fileName,
        newProjectName: newFileName.replaceAll(dialProjectFileExtension, ''),
        path: parentPath,
        targetBucket: bucket,
        targetPath: parentPath,
      });
    },
    [moveProject]
  );

  const cloneProject = useCallback<
    ApiRequestFunction<
      FileReference & {
        suppressErrors?: boolean;
        targetPath: string | null;
        targetBucket: string;
      },
      { newClonedProjectName: string }
    >
  >(
    async ({
      bucket,
      name,
      path,
      suppressErrors,
      targetPath,
      targetBucket,
    }) => {
      try {
        const folderPath = `${targetBucket}/${
          targetPath ? targetPath + '/' : ''
        }`;
        const allFiles = await getFiles({
          path: folderPath,
        });

        const projectName = name.replace(dialProjectFileExtension, '');
        const project = await getProject({ name: projectName, bucket, path });

        if (!project || !allFiles || !userBucket) {
          displayToast('error', apiMessages.cloneFileServer);

          return undefined;
        }
        const targetProjectFileName = createUniqueFileName(
          name,
          allFiles
            .filter((f) => f.nodeType !== 'FOLDER')
            .map((file) => file.name)
        );
        const targetProjectName = targetProjectFileName.replace(
          dialProjectFileExtension,
          ''
        );

        const updatedProjectSheets = updateFilesPathInputsInProject(
          project.sheets,
          constructPath([bucket, projectFoldersRootPrefix, path, projectName]),
          constructPath([
            targetBucket,
            projectFoldersRootPrefix,
            targetPath,
            targetProjectName,
          ])
        );

        const createdProjectRes = await createProject({
          projectName: targetProjectName,
          bucket: targetBucket,
          path: targetPath,
          initialProjectData: updatedProjectSheets.reduce((acc, curr) => {
            acc[curr.sheetName] = curr.content;

            return acc;
          }, {} as Record<string, string>),
          skipFolderCreation: true,
        });

        if (!createdProjectRes) {
          if (!suppressErrors) {
            displayToast('error', apiMessages.cloneProjectServer);
          }

          return undefined;
        }

        const projectFilesFromSheets = (collectFilesFromProject(
          project.sheets.map((sheet) => sheet.content)
        )
          ?.map((url) => {
            const [filesPathSegment, bucket, ...pathWithName] =
              decodeApiUrl(url).split('/');
            const parentPath = pathWithName
              .slice(0, pathWithName.length - 1)
              .join('/');
            const name = pathWithName[pathWithName.length - 1];

            if (!name || !bucket || !filesPathSegment) return null;

            return {
              bucket,
              parentPath,
              name,
            };
          })
          .filter(Boolean) ?? []) as Pick<
          FilesMetadata,
          'bucket' | 'parentPath' | 'name'
        >[];

        const projectFiles =
          (await getFiles({
            path:
              constructPath([
                bucket,
                projectFoldersRootPrefix,
                path,
                projectName,
              ]) + '/',
            isRecursive: true,
            suppressErrors: true,
          })) ?? [];

        if (!projectFiles) {
          if (suppressErrors)
            return { newClonedProjectName: targetProjectName };

          displayToast('error', apiMessages.cloneProjectServer);

          return undefined;
        }

        const projectFilesFullPaths = projectFiles.map((file) =>
          constructPath([file.bucket, file.parentPath, file.name])
        );
        const projectFilesUniqueInSheets = projectFilesFromSheets.filter(
          (file) => {
            const fullPath = constructPath([
              file.bucket,
              file.parentPath,
              file.name,
            ]);

            return !projectFilesFullPaths.includes(fullPath);
          }
        );
        const projectFilesToClone =
          projectFilesUniqueInSheets.concat(projectFiles);

        for (const file of projectFilesToClone) {
          await cloneFile({
            bucket: file.bucket,
            name: file.name,
            path: file.parentPath,
            targetPath: constructPath([
              projectFoldersRootPrefix,
              targetPath,
              targetProjectName,
            ]),
            targetBucket,
          });
        }

        return { newClonedProjectName: targetProjectName };
      } catch (e) {
        if (!suppressErrors) displayToast('error', apiMessages.cloneFileClient);

        return;
      }
    },
    [cloneFile, createProject, getFiles, getProject, userBucket]
  );

  const getViewport = useCallback<
    ApiRequestFunction<
      {
        projectPath: string;
        viewports: Viewport[];
        worksheets: Record<string, string>;
      },
      Response
    >
  >(
    async ({ projectPath, viewports, worksheets }) => {
      try {
        const body = JSON.stringify({
          calculateWorksheetsRequest: {
            project_name: projectPath,
            viewports,
            worksheets,
            includeCompilation: true,
          },
        } as ViewportRequest);

        const res = await sendAuthorizedRequest(`/v1/calculate`, {
          method: 'post',
          body,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (res.status === 503) {
          displayToast('error', apiMessages.computationPower);

          return;
        }

        if (res.status === 401) {
          displayToast('error', apiMessages.computationForbidden);

          return;
        }

        return res;
      } catch {
        displayToast('error', apiMessages.computationClient);
      }
    },
    [sendAuthorizedRequest]
  );

  const getCompileInfo = useCallback<
    ApiRequestFunction<
      {
        worksheets: Record<string, string>;
      },
      Response
    >
  >(
    async ({ worksheets }) => {
      try {
        const body = JSON.stringify({
          compileWorksheetsRequest: {
            worksheets,
          },
        } as CompileRequest);

        const res = await sendAuthorizedRequest(`/v1/compile`, {
          method: 'post',
          body,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (res.status === 401) {
          displayToast('error', apiMessages.compileForbidden);

          return;
        }

        return res;
      } catch {
        displayToast('error', apiMessages.compileClient);
      }
    },
    [sendAuthorizedRequest]
  );

  const downloadTableBlob = useCallback<
    ApiRequestFunction<
      {
        projectPath: string;
        worksheets: Record<string, string>;
        table: string;
        columns: string[];
      },
      Blob
    >
  >(
    async ({ projectPath, table, columns, worksheets }) => {
      try {
        const body = JSON.stringify({
          downloadRequest: {
            project: projectPath,
            table,
            columns,
            sheets: worksheets,
          },
        } as DownloadRequest);

        const res = await sendAuthorizedRequest(`/v1/download`, {
          method: 'post',
          body,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          displayToast('error', apiMessages.downloadTableServer);

          return;
        }

        return res.blob();
      } catch {
        displayToast('error', apiMessages.downloadTableClient);
      }
    },
    [sendAuthorizedRequest]
  );

  const getFunctions = useCallback<
    ApiRequestFunction<{ worksheets: Record<string, string> }, FunctionInfo[]>
  >(
    async ({ worksheets }) => {
      try {
        const body: FunctionsRequest = {
          functionRequest: {
            worksheets,
          },
        };
        const res = await sendAuthorizedRequest('/v1/functions', {
          body: JSON.stringify(body),
          method: 'POST',
        });

        if (!res.ok) {
          displayToast('error', apiMessages.getFunctionsServer);

          return undefined;
        }

        const resp: FunctionsResponse = await res.json();

        return resp.functionResponse.functions;
      } catch {
        displayToast('error', apiMessages.getFunctionsClient);
      }
    },
    [sendAuthorizedRequest]
  );

  const getDimensionalSchema = useCallback<
    ApiRequestFunction<
      {
        formula: string;
        worksheets: Record<string, string>;
        suppressErrors?: boolean;
      },
      DimensionalSchemaResponse
    >
  >(
    async ({ formula, worksheets, suppressErrors }) => {
      try {
        const body: DimensionalSchemaRequest = {
          dimensionalSchemaRequest: {
            worksheets,
            formula,
          },
        };
        const res = await sendAuthorizedRequest(`/v1/schema`, {
          body: JSON.stringify(body),
          method: 'POST',
        });

        if (!res.ok) {
          if (!suppressErrors) {
            displayToast('error', apiMessages.getDimSchemaServer(formula));
          }

          return undefined;
        }

        return await res.json();
      } catch {
        if (!suppressErrors) {
          displayToast('error', apiMessages.getDimSchemaClient(formula));
        }
      }
    },
    [sendAuthorizedRequest]
  );

  // Used SSE for response, so it should be handled on calling side
  const getFileNotifications = useCallback<
    ApiRequestFunction<
      { projectUrl: string; controller: AbortController },
      Response
    >
  >(
    async ({ projectUrl, controller }) => {
      try {
        const body: NotificationRequest = {
          resources: [
            {
              url: encodeApiUrl('files/' + projectUrl),
            },
          ],
        };
        const res = await sendDialRequest(`/v1/ops/resource/subscribe`, {
          body: JSON.stringify(body),
          method: 'POST',
          signal: controller.signal,
        });

        if (!res.ok) {
          displayToast('error', apiMessages.subscribeToProjectServer);

          return undefined;
        }

        return res;
      } catch (e) {
        // This error appears when browser tries to cancel pending request, handle it on level above
        if (e instanceof TypeError && e.message === 'Failed to fetch') {
          throw e;
        }
        displayToast('error', apiMessages.subscribeToProjectClient);
      }
    },
    [sendDialRequest]
  );

  return {
    acceptShare,

    cloneFile,
    cloneProject,

    createFile,
    createFolder,
    createProject,

    deleteFile,
    deleteFolder,
    deleteProject,

    downloadFiles,
    downloadTableBlob,
    getBucket,
    getDimensionalSchema,
    getFileNotifications,
    getResourceMetadata,
    getFiles,
    getFunctions,
    getProject,
    getSharedByMeFiles,
    getSharedWithMeFiles,
    getUserFiles,
    getUserProjects: getFlatUserProjects,
    getViewport,
    getCompileInfo,

    moveFile,
    moveProject,

    putProject,

    renameFile,
    renameProject,

    revokeResourcesAccess,
    discardResourcesAccess,
    sendAuthorizedRequest,
    sendDialRequest,
    shareFiles,

    getAIHintsContent,
    putAIHintsContent,
  };
};
