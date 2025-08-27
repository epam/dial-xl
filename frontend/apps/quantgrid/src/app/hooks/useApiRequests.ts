import JSZip from 'jszip';
import { useCallback, useContext } from 'react';
import { useAuth } from 'react-oidc-context';
import { parse as yamlParse, stringify as yamlStringify } from 'yaml';

import { OverlayConversation } from '@epam/ai-dial-overlay';
import {
  AIHint,
  apiMessages,
  CompileRequest,
  conversationsEndpointPrefix,
  conversationsEndpointType,
  dialAIHintsFileName,
  dialProjectFileExtension,
  DimensionalSchemaRequest,
  DimensionalSchemaResponse,
  DownloadRequest,
  emptyFileName,
  filesEndpointPrefix,
  filesEndpointType,
  FilesMetadata,
  forkedProjectMetadataKey,
  FunctionInfo,
  FunctionsRequest,
  FunctionsResponse,
  MetadataNodeType,
  MetadataResourceType,
  NotificationRequest,
  ProjectCalculateRequest,
  ProjectCancelRequest,
  projectFoldersRootPrefix,
  projectMetadataSettingsKey,
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
  convertUrlToMetadata,
  displayToast,
  encodeApiUrl,
  getConversationPath,
  getLocalConversationsPath,
  mapProjectToQGDialProject,
  mapQGDialProjectToProject,
  serialiseSetting,
  triggerDownload,
  updateFilesPathInputsInProject,
} from '../utils';
import { fetchWithProgress } from '../utils/fetch';

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

  const sendDialRequestWithProgress = useCallback(
    (
      path: string,
      params?: Omit<RequestInit, 'headers'> & {
        headers?: Record<string, string>;
      },
      onProgress?: (progress: number, event: ProgressEvent<EventTarget>) => void
    ) => {
      const headers = params?.headers || {};

      if (auth.user?.access_token) {
        headers['Authorization'] = `Bearer ${auth.user?.access_token}`;
      }

      const fullPath = window.externalEnv.dialBaseUrl + path;

      return fetchWithProgress(fullPath, { ...params, headers }, onProgress);
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
        resourceType?: FilesMetadata['resourceType'];
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
      resourceType = MetadataResourceType.FILE,
    }) => {
      try {
        let finalItems: FilesMetadata[] = [];
        let resourcesMetadata: FilesMetadata | undefined;
        let currentNextToken: string | undefined;
        const resourceEndpointType =
          resourceType === MetadataResourceType.CONVERSATION
            ? conversationsEndpointType
            : filesEndpointType;

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
          const url = `/v1/metadata/${resourceEndpointType}/${encodeApiUrl(
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

          resourcesMetadata = await res.json();

          if (resourcesMetadata) {
            finalItems = finalItems.concat(resourcesMetadata.items ?? []);
            currentNextToken = resourcesMetadata.nextToken;
          }
        } while (currentNextToken);

        if (!resourcesMetadata) return;

        return {
          ...resourcesMetadata,
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
        withPermissions: true,
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
          resourceTypes: [MetadataResourceType.FILE],
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
          resourceTypes: [MetadataResourceType.FILE],
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

  const getSharedWithMeConversations = useCallback<
    ApiRequestFunction<void, FilesMetadata[]>
  >(async () => {
    try {
      const url = `/v1/ops/resource/share/list`;
      const res = await sendDialRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          resourceTypes: [MetadataResourceType.CONVERSATION],
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
          curr.nodeType === MetadataNodeType.ITEM &&
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
        onProgress?: (
          progress: number,
          event: ProgressEvent<EventTarget>
        ) => void;
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

        const data: FilesMetadata = await res.json();
        const etag = res.headers.get('Etag');

        return { file: data, etag };
      } catch {
        displayToast('error', apiMessages.createFileClient);
      }
    },
    [sendDialRequestWithProgress]
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
        suppressErrors?: boolean;
      },
      unknown
    >
  >(
    async ({ bucket, path = '', fileName, suppressErrors }) => {
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
        settingsToAdd?: ProjectState['settings'];
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
      settingsToAdd,
    }) => {
      const newProjectData: QGDialProject = initialProjectData ?? {
        [defaultSheetName]: '',
      };

      if (settingsToAdd) {
        for (const [rawKey, rawValue] of Object.entries(settingsToAdd)) {
          const key = rawKey as keyof ProjectState['settings'];
          newProjectData[`/${key}`] = serialiseSetting(key, rawValue);
        }
      }

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

  const checkProjectExists = useCallback<
    ApiRequestFunction<FileReference, boolean>
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

        return res.ok;
      } catch {
        return false;
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

  const getConversations = useCallback<
    ApiRequestFunction<
      {
        folder: string;
        suppressErrors?: boolean;
      },
      OverlayConversation[]
    >
  >(
    async ({ folder, suppressErrors }) => {
      const fileMetadata = await getResourceMetadata({
        resourceType: MetadataResourceType.CONVERSATION,
        path: folder,
        suppressErrors: true,
        withPermissions: true,
      });

      if (!fileMetadata && !suppressErrors) {
        displayToast('error', apiMessages.getConversationsServer);
      }

      return fileMetadata?.items as OverlayConversation[] | undefined;
    },
    [getResourceMetadata]
  );

  const deleteConversation = useCallback(
    async (
      bucket: string,
      parentPath: string | null | undefined,
      name: string
    ) => {
      const url = encodeApiUrl(
        constructPath([conversationsEndpointPrefix, bucket, parentPath, name])
      );

      return await sendDialRequest(url, {
        method: 'DELETE',
      });
    },
    [sendDialRequest]
  );

  const deleteProjectConversations = useCallback<
    ApiRequestFunction<
      FileReference & {
        projectName: string;
      },
      unknown
    >
  >(
    async ({ bucket, path, projectName }) => {
      try {
        const conversationsFolder =
          getConversationPath({
            bucket,
            path,
            projectName,
          }) + '/';

        const conversations = await getConversations({
          folder: conversationsFolder,
          suppressErrors: true,
        });

        if (!conversations) return;

        const deleteJobs: Promise<unknown>[] = [];

        const queueDelete = (meta: OverlayConversation) => {
          deleteJobs.push(
            deleteConversation(meta.bucket, meta.parentPath, meta.name)
          );
        };

        conversations.forEach(queueDelete);

        await Promise.all(deleteJobs);
      } catch (e) {
        displayToast('error', apiMessages.deleteConversationClient);

        return;
      }
    },
    [deleteConversation, getConversations]
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

        deleteProjectConversations({
          bucket,
          path,
          name,
          projectName: name,
        });

        return {};
      } catch {
        displayToast('error', apiMessages.deleteProjectClient);
      }
    },
    [deleteFolder, deleteProjectConversations, sendDialRequest]
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
      (FileReference & {
        nodeType: MetadataNodeType.FOLDER | MetadataNodeType.ITEM;
      })[],
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
                  (nodeType === MetadataNodeType.FOLDER ? '/' : '')
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
      (FileReference & {
        nodeType: MetadataNodeType.FOLDER | MetadataNodeType.ITEM;
      })[],
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
                  (nodeType === MetadataNodeType.FOLDER ? '/' : '')
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
          if (res.status === 404) {
            displayToast('error', apiMessages.acceptShareProjectNotFoundServer);
          } else {
            displayToast('error', apiMessages.acceptShareProjectServer);
          }

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

        const fileNamesInDestination = (allFilesInDestination ?? [])
          .filter((f) => f.nodeType !== MetadataNodeType.FOLDER)
          .map((file) => file.name);
        const targetFileName = fileNamesInDestination.includes(name)
          ? createUniqueFileName(name, fileNamesInDestination)
          : name;

        const sourceUrl = encodeApiUrl(
          constructPath(['files', bucket, path, name])
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

  const moveConversation = useCallback(
    async (
      bucket: string,
      parentPath: string | null | undefined,
      name: string,
      destinationFolder: string
    ) => {
      return await sendDialRequest('/v1/ops/resource/move', {
        method: 'POST',
        body: JSON.stringify({
          sourceUrl: encodeApiUrl(
            constructPath(['conversations', bucket, parentPath, name])
          ),
          destinationUrl: encodeApiUrl(`${destinationFolder}${name}`),
        }),
      });
    },
    [sendDialRequest]
  );

  const moveProjectConversations = useCallback<
    ApiRequestFunction<
      FileReference & {
        suppressErrors?: boolean;
        targetPath: string | null | undefined;
        targetBucket: string;
        projectName: string;
        targetProjectName: string;
      },
      unknown
    >
  >(
    async ({
      bucket,
      path,
      suppressErrors,
      targetPath,
      targetBucket,
      projectName,
      targetProjectName,
    }) => {
      try {
        const conversationsFolder =
          getConversationPath({
            bucket,
            path,
            projectName,
          }) + '/';

        const destConversationsPath =
          constructPath([
            conversationsEndpointType,
            getConversationPath({
              bucket: targetBucket,
              path: targetPath,
              projectName: targetProjectName,
            }),
          ]) + '/';

        const conversations = await getConversations({
          folder: conversationsFolder,
          suppressErrors: true,
        });

        if (!conversations) return;

        const copyJobs: Promise<unknown>[] = [];

        const queueCopy = (meta: OverlayConversation) => {
          copyJobs.push(
            moveConversation(
              meta.bucket,
              meta.parentPath,
              meta.name,
              destConversationsPath
            )
          );
        };

        conversations.forEach(queueCopy);

        await Promise.all(copyJobs);
      } catch (e) {
        if (!suppressErrors)
          displayToast('error', apiMessages.moveConversationClient);

        return;
      }
    },
    [moveConversation, getConversations]
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
          constructPath([
            targetBucket,
            projectFoldersRootPrefix,
            targetPath,
            newProjectName,
          ])
        );

        const settingsToAdd: ProjectState['settings'] = {
          [projectMetadataSettingsKey]: {
            ...(project.settings?.[projectMetadataSettingsKey] ?? {}),
          },
        };

        // 2. Create project with updated content
        const createdProjectRes = await createProject({
          projectName: newProjectName,
          bucket: targetBucket,
          path: targetPath,
          initialProjectData: updatedProjectSheets.reduce((acc, curr) => {
            acc[curr.sheetName] = curr.content;

            return acc;
          }, {} as Record<string, string>),
          settingsToAdd,
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

        moveProjectConversations({
          bucket,
          path,
          name,
          targetPath,
          targetBucket,
          projectName,
          targetProjectName: newProjectName,
          suppressErrors,
        });

        return {};
      } catch {
        displayToast('error', apiMessages.moveToFolderClient);
      }
    },
    [
      createProject,
      deleteFile,
      getProject,
      moveFolder,
      moveProjectConversations,
    ]
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

  const copyConversation = useCallback(
    async (
      bucket: string,
      parentPath: string | null | undefined,
      name: string,
      destinationFolder: string
    ) => {
      return await sendDialRequest('/v1/ops/resource/copy', {
        method: 'POST',
        body: JSON.stringify({
          sourceUrl: encodeApiUrl(
            constructPath(['conversations', bucket, parentPath, name])
          ),
          destinationUrl: encodeApiUrl(`${destinationFolder}${name}`),
        }),
      });
    },
    [sendDialRequest]
  );

  const cloneProjectConversations = useCallback<
    ApiRequestFunction<
      FileReference & {
        suppressErrors?: boolean;
        targetPath: string | null;
        targetBucket: string;
        projectName: string;
        targetProjectName: string;
        isReadOnly: boolean;
      },
      unknown
    >
  >(
    async ({
      bucket,
      path,
      suppressErrors,
      targetPath,
      targetBucket,
      projectName,
      targetProjectName,
      isReadOnly,
    }) => {
      try {
        const conversationsFolder =
          getConversationPath({
            bucket,
            path,
            projectName,
          }) + '/';

        const destConversationsPath =
          constructPath([
            conversationsEndpointType,
            getConversationPath({
              bucket: targetBucket,
              path: targetPath,
              projectName: targetProjectName,
            }),
          ]) + '/';

        const localConversationsFolder =
          getLocalConversationsPath({
            userBucket,
            bucket,
            path,
            projectName,
          }) + '/';

        const conversations =
          (await getConversations({
            folder: conversationsFolder,
            suppressErrors: true,
          })) ?? [];
        const localConversations = isReadOnly
          ? (await getConversations({
              folder: localConversationsFolder,
              suppressErrors: true,
            })) ?? []
          : [];

        if (!conversations) return;

        const existingNames = new Set<string>();
        const copyJobs: Promise<unknown>[] = [];

        const queueCopy = (meta: OverlayConversation) => {
          let finalName = meta.name;
          if (existingNames.has(finalName)) {
            finalName = createUniqueFileName(finalName, [...existingNames]);
          }
          existingNames.add(finalName);

          copyJobs.push(
            copyConversation(
              meta.bucket,
              meta.parentPath,
              finalName,
              destConversationsPath
            )
          );
        };

        conversations.forEach(queueCopy);
        localConversations.forEach(queueCopy);

        await Promise.all(copyJobs);
      } catch (e) {
        if (!suppressErrors)
          displayToast('error', apiMessages.cloneConversationsClient);

        return;
      }
    },
    [copyConversation, getConversations, userBucket]
  );

  const cloneProject = useCallback<
    ApiRequestFunction<
      FileReference & {
        suppressErrors?: boolean;
        targetPath: string | null;
        targetBucket: string;
        sheetsOverride?: WorksheetState[] | null;
        isReadOnly: boolean;
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
      sheetsOverride,
      isReadOnly,
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
            .filter((f) => f.nodeType !== MetadataNodeType.FOLDER)
            .map((file) => file.name)
        );
        const targetProjectName = targetProjectFileName.replace(
          dialProjectFileExtension,
          ''
        );

        const projectSheets = sheetsOverride ?? project.sheets;
        const updatedProjectSheets = updateFilesPathInputsInProject(
          projectSheets,
          constructPath([
            targetBucket,
            projectFoldersRootPrefix,
            targetPath,
            targetProjectName,
          ])
        );

        const settingsToAdd: ProjectState['settings'] = {
          [projectMetadataSettingsKey]: {
            ...(project.settings?.[projectMetadataSettingsKey] ?? {}),
            [forkedProjectMetadataKey]: {
              bucket,
              path,
              projectName,
            },
          },
        };

        const createdProjectRes = await createProject({
          projectName: targetProjectName,
          bucket: targetBucket,
          path: targetPath,
          initialProjectData: updatedProjectSheets.reduce((acc, curr) => {
            acc[curr.sheetName] = curr.content;

            return acc;
          }, {} as Record<string, string>),
          skipFolderCreation: true,
          settingsToAdd,
        });

        if (!createdProjectRes) {
          if (!suppressErrors) {
            displayToast('error', apiMessages.cloneProjectServer);
          }

          return undefined;
        }

        const projectFilesFromSheets = (collectFilesFromProject(
          projectSheets.map((sheet) => sheet.content)
        )
          ?.map(convertUrlToMetadata)
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
            suppressErrors: true,
          });
        }

        await cloneProjectConversations({
          bucket,
          name,
          path,
          suppressErrors,
          targetPath,
          targetBucket,
          projectName,
          targetProjectName,
          isReadOnly,
        });

        return { newClonedProjectName: targetProjectName };
      } catch (e) {
        if (!suppressErrors) displayToast('error', apiMessages.cloneFileClient);

        return;
      }
    },
    [
      cloneProjectConversations,
      cloneFile,
      createProject,
      getFiles,
      getProject,
      userBucket,
    ]
  );

  const getViewport = useCallback<
    ApiRequestFunction<
      {
        projectPath: string;
        viewports: Viewport[];
        worksheets: Record<string, string>;
        hasEditPermissions?: boolean;
        controller?: AbortController;
      },
      Response
    >
  >(
    async ({
      projectPath,
      viewports,
      worksheets,
      hasEditPermissions = false,
      controller,
    }) => {
      try {
        const body = JSON.stringify({
          calculateWorksheetsRequest: {
            project_name: projectPath,
            viewports,
            worksheets,
            includeCompilation: true,
            includeProfile: true,
            includeIndices: true,
            shared: hasEditPermissions,
          },
        } as ViewportRequest);

        const res = await sendAuthorizedRequest(`/v1/calculate`, {
          method: 'post',
          body,
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller?.signal,
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
      } catch (error) {
        // Don't show error toast if request was aborted
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
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

  const sendProjectCalculate = useCallback<
    ApiRequestFunction<
      {
        projectPath: string;
      },
      Response
    >
  >(
    async ({ projectPath }) => {
      try {
        const body = JSON.stringify({
          projectCalculateRequest: {
            project: projectPath,
          },
        } as ProjectCalculateRequest);

        const res = await sendAuthorizedRequest(`/v1/project/calculate`, {
          method: 'post',
          body,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          displayToast('error', apiMessages.projectCalculateServer);

          return;
        }

        return res;
      } catch {
        displayToast('error', apiMessages.projectCalculateClient);
      }
    },
    [sendAuthorizedRequest]
  );

  const sendProjectCancel = useCallback<
    ApiRequestFunction<
      {
        projectPath: string;
      },
      Response
    >
  >(
    async ({ projectPath }) => {
      try {
        const body = JSON.stringify({
          projectCancelRequest: {
            project: projectPath,
          },
        } as ProjectCancelRequest);

        const res = await sendAuthorizedRequest(`/v1/project/cancel`, {
          method: 'post',
          body,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          displayToast('error', apiMessages.projectCalculateServer);

          return;
        }

        return res;
      } catch {
        displayToast('error', apiMessages.projectCancelClient);
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
              url: encodeApiUrl(`${filesEndpointType}/` + projectUrl),
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

  /**
   * Reset a project to the state of the source project without removing the project yaml.
   */
  const resetProject = useCallback<
    ApiRequestFunction<
      {
        bucket: string;
        path?: string | null;
        projectName: string;
        sourceBucket: string;
        sourcePath: string;
        sourceName: string;
      },
      ProjectState | undefined
    >
  >(
    async ({
      bucket,
      path = '',
      projectName,
      sourceName,
      sourcePath = '',
      sourceBucket,
    }) => {
      const currentProject = await getProject({
        bucket,
        path,
        name: projectName,
      });
      if (!currentProject) return;

      /* Delete all files related to the current project */
      await deleteFolder({
        bucket,
        parentPath: constructPath([
          projectFoldersRootPrefix,
          path,
          projectName,
        ]),
        name: '',
        suppressErrors: true,
      });

      /* Pull a source project, rewrite paths, overwrite YAML */
      const sourceProject = await getProject({
        bucket: sourceBucket,
        path: sourcePath,
        name: sourceName,
      });
      if (!sourceProject) return;

      const updatedSheets = updateFilesPathInputsInProject(
        sourceProject.sheets,
        constructPath([bucket, projectFoldersRootPrefix, path, projectName])
      );

      const updatedProject = await putProject({
        ...currentProject,
        sheets: updatedSheets,
        settings: {
          ...currentProject.settings,
          [projectMetadataSettingsKey]: {
            [forkedProjectMetadataKey]: {
              bucket: sourceBucket,
              path: sourcePath,
              projectName: sourceName,
            },
          },
        },
      });
      if (!updatedProject) return;

      /* Gather all files from source project and clone them */
      const srcFolderFiles =
        (await getFiles({
          path:
            constructPath([
              sourceBucket,
              projectFoldersRootPrefix,
              sourcePath,
              sourceName,
            ]) + '/',
          isRecursive: true,
          suppressErrors: true,
        })) ?? [];

      const extraFiles =
        (collectFilesFromProject(sourceProject.sheets.map((s) => s.content))
          ?.map(convertUrlToMetadata)
          .filter(Boolean) as Pick<
          FilesMetadata,
          'bucket' | 'parentPath' | 'name'
        >[]) ?? [];

      const filesToClone = [...srcFolderFiles, ...extraFiles];

      for (const file of filesToClone) {
        await cloneFile({
          bucket: file.bucket,
          name: file.name,
          path: file.parentPath,
          targetBucket: bucket,
          targetPath: constructPath([
            projectFoldersRootPrefix,
            path,
            projectName,
          ]),
          suppressErrors: true,
        });
      }

      return updatedProject;
    },
    [getProject, deleteFolder, putProject, getFiles, cloneFile]
  );

  const updateForkedProjectMetadata = useCallback<
    ApiRequestFunction<
      {
        bucket: string;
        path?: string | null;
        projectName: string;
        forkBucket: string;
        forkPath?: string | null;
        forkProjectName: string;
        suppressErrors?: boolean;
      },
      ProjectState | undefined
    >
  >(
    async ({
      bucket,
      path = '',
      projectName,
      forkBucket,
      forkPath = '',
      forkProjectName,
      suppressErrors = false,
    }) => {
      try {
        const current = await getProject({ bucket, path, name: projectName });
        if (!current) return;

        const updatedSettings: ProjectState['settings'] = {
          ...(current.settings ?? {}),
          [projectMetadataSettingsKey]: {
            ...(current.settings?.[projectMetadataSettingsKey] ?? {}),
            [forkedProjectMetadataKey]: {
              bucket: forkBucket,
              path: forkPath,
              projectName: forkProjectName,
            },
          },
        };

        const updated = await putProject({
          ...current,
          settings: updatedSettings,
        });

        if (!updated && !suppressErrors) {
          displayToast('error', apiMessages.putProjectServer);
        }

        return updated;
      } catch {
        if (!suppressErrors) {
          displayToast('error', apiMessages.putProjectClient);
        }

        return;
      }
    },
    [getProject, putProject]
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

    getSharedWithMeConversations,

    moveFile,
    moveProject,

    putProject,

    renameFile,
    renameProject,

    resetProject,
    updateForkedProjectMetadata,

    revokeResourcesAccess,
    discardResourcesAccess,
    sendAuthorizedRequest,
    sendDialRequest,
    shareFiles,

    getAIHintsContent,
    putAIHintsContent,

    checkProjectExists,

    sendProjectCancel,
    sendProjectCalculate,
  };
};
