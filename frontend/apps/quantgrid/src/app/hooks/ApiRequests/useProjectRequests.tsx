import { useCallback } from 'react';
import { AuthContextProps } from 'react-oidc-context';
import { parse as yamlParse, stringify as yamlStringify } from 'yaml';

import {
  ApiErrorType,
  apiMessages,
  ApiRequestFunctionWithError,
  bindConversationsRootFolder,
  defaultSheetName,
  dialProjectFileExtension,
  filesEndpointPrefix,
  filesEndpointType,
  forkedProjectMetadataKey,
  MetadataNodeType,
  NotificationRequest,
  projectFoldersRootPrefix,
  projectMetadataSettingsKey,
  ProjectState,
  QGDialProject,
  ResourceMetadata,
  WorksheetState,
} from '@frontend/common';

import { FileReference } from '../../common';
import { createUniqueFileName } from '../../services';
import {
  classifyFetchError,
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
  updateFilesPathInputsInProject,
  updateMessagesProjectFoldersPath,
} from '../../utils';
import { useBackendRequest } from './useBackendRequests';
import { useConversationResourceRequests } from './useConversationsRequests';
import { useFileResourceRequests } from './useFileResourceRequests';

export const useProjectRequests = (
  auth: AuthContextProps,
  userBucket: string | undefined,
) => {
  const { sendDialRequest } = useBackendRequest(auth);
  const {
    getFiles,
    createFolder,
    createFile,
    deleteFolder,
    deleteFile,
    moveFolder,
    cloneFile,
    getUserFiles,
  } = useFileResourceRequests(auth, userBucket);
  const {
    getConversations,
    deleteConversation,
    getConversation,
    putConversation,
  } = useConversationResourceRequests(auth);

  const getFlatUserProjects = useCallback<
    ApiRequestFunctionWithError<void, ResourceMetadata[]>
  >(async () => {
    if (!userBucket) {
      return {
        success: false,
        error: {
          type: ApiErrorType.Unknown,
          message: apiMessages.getProjectClient,
        },
      };
    }

    const files = await getUserFiles({ isRecursive: true });

    if (!files.success) {
      return {
        success: false,
        error: files.error,
      };
    }

    const flatFiles = (
      files: ResourceMetadata[],
      acc: ResourceMetadata[],
    ): ResourceMetadata[] =>
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

    const flattedFiles = flatFiles(files.data, [] as ResourceMetadata[]);

    return {
      success: true,
      data: flattedFiles,
    };
  }, [getUserFiles, userBucket]);

  const createProject = useCallback<
    ApiRequestFunctionWithError<
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

      if (!data.success) {
        return {
          success: false,
          error: data.error,
        };
      }

      if (!skipFolderCreation) {
        const folderResult = await createFolder({
          bucket,
          name: projectName,
          parentPath: constructPath([projectFoldersRootPrefix, path]),
          suppressErrors: true,
        });

        if (!folderResult.success) {
          return {
            success: false,
            error: folderResult.error,
          };
        }
      }

      return {
        success: true,
        data: {
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
            [] as WorksheetState[],
          ),
          version: data.data.etag ?? '',
        },
      };
    },
    [createFile, createFolder],
  );

  const checkProjectExists = useCallback<
    ApiRequestFunctionWithError<FileReference, boolean>
  >(
    async ({ bucket, parentPath = '', name }) => {
      try {
        const res = await sendDialRequest(
          encodeApiUrl(
            constructPath([
              filesEndpointPrefix,
              bucket,
              parentPath,
              name + dialProjectFileExtension,
            ]),
          ),
        );

        return {
          success: true,
          data: res.ok,
        };
      } catch (error) {
        return {
          success: false,
          error: classifyFetchError(error, apiMessages.getProjectClient),
        };
      }
    },
    [sendDialRequest],
  );

  const getProject = useCallback<
    ApiRequestFunctionWithError<FileReference, ProjectState>
  >(
    async ({ bucket, parentPath = '', name }) => {
      try {
        const res = await sendDialRequest(
          encodeApiUrl(
            constructPath([
              filesEndpointPrefix,
              bucket,
              parentPath,
              name + dialProjectFileExtension,
            ]),
          ),
        );

        if (!res.ok) {
          displayToast('error', apiMessages.getProjectServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.getProjectServer,
              statusCode: res.status,
            },
          };
        }

        const text = await res.text();
        const data: QGDialProject = yamlParse(text);
        const version = res.headers.get('Etag') ?? '';

        return {
          success: true,
          data: mapQGDialProjectToProject(
            data,
            name,
            bucket,
            parentPath,
            version,
          ),
        };
      } catch (error) {
        displayToast('error', apiMessages.getProjectClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.getProjectClient),
        };
      }
    },
    [sendDialRequest],
  );

  const putProject = useCallback<
    ApiRequestFunctionWithError<ProjectState, ProjectState>
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
          },
        );
        const formData = new FormData();
        formData.append('attachment', file);

        const res = await sendDialRequest(
          encodeApiUrl(
            constructPath([
              filesEndpointPrefix,
              projectData.bucket,
              projectData.path,
              projectData.projectName + dialProjectFileExtension,
            ]),
          ),
          {
            method: 'PUT',
            body: formData,
            headers: projectData.version
              ? {
                  'If-Match': projectData.version,
                }
              : undefined,
          },
        );

        if (!res.ok) {
          if (res.status === 412) {
            displayToast('error', apiMessages.putProjectVersion);
          } else if (res.status === 403) {
            displayToast('error', apiMessages.putProjectForbidden);
          } else {
            displayToast('error', apiMessages.putProjectServer);
          }

          return {
            success: false,
            error: {
              type:
                res.status === 403
                  ? ApiErrorType.Unauthorized
                  : ApiErrorType.ServerError,
              message:
                res.status === 412
                  ? apiMessages.putProjectVersion
                  : res.status === 403
                    ? apiMessages.putProjectForbidden
                    : apiMessages.putProjectServer,
              statusCode: res.status,
            },
          };
        }
        const version = res.headers.get('Etag') ?? '';

        return {
          success: true,
          data: {
            ...projectData,
            version,
          },
        };
      } catch (error) {
        displayToast('error', apiMessages.putProjectClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.putProjectClient),
        };
      }
    },
    [sendDialRequest],
  );

  const deleteProjectConversations = useCallback<
    ApiRequestFunctionWithError<
      FileReference & {
        projectName: string;
      },
      void
    >
  >(
    async ({ bucket, parentPath, projectName }) => {
      try {
        const conversationsFolder =
          getConversationPath({
            bucket,
            path: parentPath,
            projectName,
          }) + '/';

        const conversations = await getConversations({
          folder: conversationsFolder,
          suppressErrors: true,
        });

        if (!conversations.success) {
          return {
            success: false,
            error: conversations.error,
          };
        }

        const deleteJobs: Promise<unknown>[] = [];

        const queueDelete = (meta: ResourceMetadata) => {
          deleteJobs.push(
            deleteConversation(meta.bucket, meta.parentPath, meta.name),
          );
        };

        conversations.data.forEach(queueDelete);

        await Promise.all(deleteJobs);

        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        displayToast('error', apiMessages.deleteConversationClient);

        return {
          success: false,
          error: classifyFetchError(
            error,
            apiMessages.deleteConversationClient,
          ),
        };
      }
    },
    [deleteConversation, getConversations],
  );

  const deleteProject = useCallback<
    ApiRequestFunctionWithError<FileReference, void>
  >(
    async ({ bucket, parentPath = '', name }) => {
      try {
        // TODO: check escaping
        const res = await sendDialRequest(
          encodeApiUrl(
            `${filesEndpointPrefix}/${bucket}/${
              parentPath ? parentPath + '/' : ''
            }${name}${dialProjectFileExtension}`,
          ),
          {
            method: 'DELETE',
          },
        );

        if (!res.ok) {
          if (res.status === 403) {
            displayToast('error', apiMessages.deleteProjectForbidden);
          } else {
            displayToast('error', apiMessages.deleteProjectServer);
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
                  ? apiMessages.deleteProjectForbidden
                  : apiMessages.deleteProjectServer,
              statusCode: res.status,
            },
          };
        }

        const deleteFolderRes = await deleteFolder({
          bucket,
          parentPath: `${projectFoldersRootPrefix}/${
            parentPath ? parentPath + '/' : ''
          }${name}`,
          name: '',
          suppressErrors: true,
        });

        if (!deleteFolderRes.success) {
          return {
            success: false,
            error: deleteFolderRes.error,
          };
        }

        await deleteProjectConversations({
          bucket,
          parentPath,
          name,
          projectName: name,
        });

        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        displayToast('error', apiMessages.deleteProjectClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.deleteProjectClient),
        };
      }
    },
    [deleteFolder, deleteProjectConversations, sendDialRequest],
  );

  const moveProjectConversations = useCallback<
    ApiRequestFunctionWithError<
      FileReference & {
        suppressErrors?: boolean;
        targetPath: string | null | undefined;
        targetBucket: string;
        projectName: string;
        targetProjectName: string;
      },
      void
    >
  >(
    async ({
      bucket,
      parentPath,
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
            path: parentPath,
            projectName,
          }) + '/';

        const conversations = await getConversations({
          folder: conversationsFolder,
          suppressErrors: true,
        });

        if (!conversations.success) {
          return {
            success: false,
            error: conversations.error,
          };
        }

        const moveJobs: Promise<unknown>[] = [];

        const queueCopy = async (meta: ResourceMetadata) => {
          const conversationRes = await getConversation({
            ...meta,
            parentPath: meta.parentPath,
          });

          if (!conversationRes.success) return Promise.reject();

          const projectFolderCurrentPath = constructPath([
            bucket,
            projectFoldersRootPrefix,
            parentPath,
            projectName,
          ]);
          const projectFolderTargetPath = constructPath([
            targetBucket,
            projectFoldersRootPrefix,
            targetPath,
            targetProjectName,
          ]);
          const replacedMessages = updateMessagesProjectFoldersPath(
            conversationRes.data.messages,
            projectFolderCurrentPath,
            projectFolderTargetPath,
          );

          const putConvRes = await putConversation({
            bucket: targetBucket,
            parentPath: constructPath([
              bindConversationsRootFolder,
              targetPath,
              targetProjectName,
            ]),
            name: meta.name,
            conversation: {
              ...conversationRes.data,
              messages: replacedMessages,
            },
          });

          if (!putConvRes.success) return Promise.reject();

          await deleteConversation(
            bucket,
            constructPath([
              bindConversationsRootFolder,
              parentPath,
              projectName,
            ]),
            meta.name,
          );
        };

        conversations.data.forEach((conv) => moveJobs.push(queueCopy(conv)));

        await Promise.all(moveJobs);

        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        if (!suppressErrors)
          displayToast('error', apiMessages.moveConversationClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.moveConversationClient),
        };
      }
    },
    [getConversations, getConversation, putConversation, deleteConversation],
  );

  const moveProject = useCallback<
    ApiRequestFunctionWithError<
      FileReference & {
        targetPath: string | null | undefined;
        targetBucket: string;
        newProjectName?: string;
        suppressErrors?: boolean;
        onProgress?: (progress: number) => void;
      },
      void
    >
  >(
    async ({
      name,
      newProjectName: newProjectNameParam,
      bucket,
      parentPath,
      targetPath,
      targetBucket,
      suppressErrors,
      onProgress,
    }) => {
      try {
        const projectName = name.replace(dialProjectFileExtension, '');
        const newProjectName = newProjectNameParam ?? projectName;

        onProgress?.(0);

        // 1. Get project and update it's content
        const project = await getProject({
          name: projectName,
          bucket,
          parentPath: parentPath,
        });

        onProgress?.(10);

        if (!project.success) {
          displayToast('error', apiMessages.moveToFolderServer);

          return {
            success: false,
            error: project.error,
          };
        }

        const currentPath = constructPath([
          bucket,
          projectFoldersRootPrefix,
          parentPath,
          projectName,
        ]);
        const targetResultingPath = constructPath([
          targetBucket,
          projectFoldersRootPrefix,
          targetPath,
          newProjectName,
        ]);

        const updatedProjectSheets = updateFilesPathInputsInProject(
          project.data.sheets,
          currentPath,
          targetResultingPath,
        );

        onProgress?.(20);

        const settingsToAdd: ProjectState['settings'] = {
          [projectMetadataSettingsKey]: {
            ...(project.data.settings?.[projectMetadataSettingsKey] ?? {}),
          },
        };

        // 2. Create project with updated content
        const createdProjectRes = await createProject({
          projectName: newProjectName,
          bucket: targetBucket,
          path: targetPath,
          initialProjectData: updatedProjectSheets.reduce(
            (acc, curr) => {
              acc[curr.sheetName] = curr.content;

              return acc;
            },
            {} as Record<string, string>,
          ),
          settingsToAdd,
          skipFolderCreation: true,
        });

        onProgress?.(30);

        if (!createdProjectRes.success) {
          displayToast('error', apiMessages.moveToFolderServer);

          return {
            success: false,
            error: createdProjectRes.error,
          };
        }

        // 3. Delete the original project
        const deleteProjectRes = await deleteFile({
          fileName: name,
          bucket,
          parentPath,
        });

        onProgress?.(40);

        if (!deleteProjectRes.success) {
          displayToast('error', apiMessages.moveToFolderServer);

          return {
            success: false,
            error: deleteProjectRes.error,
          };
        }

        // 4. Move related files
        const projectFiles = await moveFolder({
          bucket,
          parentPath: constructPath([projectFoldersRootPrefix, parentPath]),
          name: projectName,
          newName: newProjectName,
          targetBucket,
          targetParentPath: constructPath([
            projectFoldersRootPrefix,
            targetPath,
          ]),
          onProgress: onProgress
            ? (progress: number) => {
                // Map moveFolder progress (0-100%) to moveProject range (40-80%)
                onProgress(40 + (progress * 40) / 100);
              }
            : undefined,
        });

        onProgress?.(80);

        if (!projectFiles.success) {
          if (suppressErrors) {
            return {
              success: true,
              data: undefined,
            };
          }

          displayToast('error', apiMessages.moveToFolderServer);

          return {
            success: false,
            error: projectFiles.error,
          };
        }

        await moveProjectConversations({
          bucket,
          parentPath,
          name,
          targetPath,
          targetBucket,
          projectName,
          targetProjectName: newProjectName,
          suppressErrors,
        });

        onProgress?.(100);

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
    [
      createProject,
      deleteFile,
      getProject,
      moveFolder,
      moveProjectConversations,
    ],
  );

  const renameProject = useCallback<
    ApiRequestFunctionWithError<
      {
        bucket: string;
        fileName: string;
        newFileName: string;
        parentPath: string | null | undefined;
        onProgress?: (progress: number) => void;
      },
      void
    >
  >(
    async ({ bucket, fileName, newFileName, parentPath, onProgress }) => {
      return moveProject({
        bucket,
        name: fileName,
        newProjectName: newFileName.replaceAll(dialProjectFileExtension, ''),
        parentPath,
        targetBucket: bucket,
        targetPath: parentPath,
        onProgress,
      });
    },
    [moveProject],
  );

  const cloneProjectConversations = useCallback<
    ApiRequestFunctionWithError<
      FileReference & {
        suppressErrors?: boolean;
        targetPath: string | null;
        targetBucket: string;
        projectName: string;
        targetProjectName: string;
        isReadOnly: boolean;
      },
      void
    >
  >(
    async ({
      bucket,
      parentPath,
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
            path: parentPath,
            projectName,
          }) + '/';

        const localConversationsFolder =
          getLocalConversationsPath({
            userBucket,
            bucket,
            path: parentPath,
            projectName,
          }) + '/';

        const conversationsResponse = await getConversations({
          folder: conversationsFolder,
          suppressErrors: true,
        });
        const conversations = conversationsResponse.success
          ? conversationsResponse.data
          : [];

        const localConversationsResponse = isReadOnly
          ? await getConversations({
              folder: localConversationsFolder,
              suppressErrors: true,
            })
          : null;
        const localConversations = localConversationsResponse?.success
          ? localConversationsResponse.data
          : [];

        const existingNames = new Set<string>();
        const copyJobs: Promise<unknown>[] = [];

        const queueCopy = async (meta: ResourceMetadata) => {
          let finalName = meta.name;
          if (existingNames.has(finalName)) {
            finalName = createUniqueFileName(finalName, [...existingNames]);
          }
          existingNames.add(finalName);

          const conversationRes = await getConversation({
            ...meta,
            parentPath: meta.parentPath,
          });

          if (!conversationRes.success) return Promise.reject();

          const currentProjectFolderPath = constructPath([
            bucket,
            projectFoldersRootPrefix,
            parentPath,
            projectName,
          ]);
          const projectFolderTargetPath = constructPath([
            targetBucket,
            projectFoldersRootPrefix,
            targetPath,
            targetProjectName,
          ]);
          const replacedMessages = updateMessagesProjectFoldersPath(
            conversationRes.data.messages,
            currentProjectFolderPath,
            projectFolderTargetPath,
          );

          const putConvRes = await putConversation({
            bucket: targetBucket,
            parentPath: constructPath([
              bindConversationsRootFolder,
              targetPath,
              targetProjectName,
            ]),
            name: finalName,
            conversation: {
              ...conversationRes.data,
              messages: replacedMessages,
            },
          });

          if (!putConvRes.success) return Promise.reject();
        };

        conversations.forEach((conv) => copyJobs.push(queueCopy(conv)));
        localConversations.forEach((conv) => copyJobs.push(queueCopy(conv)));

        await Promise.all(copyJobs);

        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        if (!suppressErrors)
          displayToast('error', apiMessages.cloneConversationsClient);

        return {
          success: false,
          error: classifyFetchError(
            error,
            apiMessages.cloneConversationsClient,
          ),
        };
      }
    },
    [getConversation, getConversations, putConversation, userBucket],
  );

  const cloneProject = useCallback<
    ApiRequestFunctionWithError<
      FileReference & {
        suppressErrors?: boolean;
        targetPath: string | null;
        targetBucket: string;
        sheetsOverride?: WorksheetState[] | null;
        isReadOnly: boolean;
        newName?: string;
        onProgress?: (progress: number) => void;
      },
      { newClonedProjectName: string }
    >
  >(
    async ({
      bucket,
      name,
      parentPath,
      suppressErrors,
      targetPath,
      targetBucket,
      sheetsOverride,
      isReadOnly,
      newName,
      onProgress,
    }) => {
      try {
        const folderPath = `${targetBucket}/${
          targetPath ? targetPath + '/' : ''
        }`;
        const allFilesRes = await getFiles({
          path: folderPath,
        });
        const allFiles = allFilesRes.success ? allFilesRes.data : [];
        const projectName = name.replace(dialProjectFileExtension, '');
        const project = await getProject({
          name: projectName,
          bucket,
          parentPath,
        });

        onProgress?.(10);

        if (!project.success || !userBucket) {
          displayToast('error', apiMessages.cloneFileServer);

          return {
            success: false,
            error: project.success
              ? {
                  type: ApiErrorType.Unknown,
                  message: apiMessages.cloneFileServer,
                }
              : project.error,
          };
        }
        const targetProjectFileName = createUniqueFileName(
          newName || name,
          allFiles
            .filter((f) => f.nodeType !== MetadataNodeType.FOLDER)
            .map((file) => file.name),
        );
        const targetProjectName = targetProjectFileName.replace(
          dialProjectFileExtension,
          '',
        );

        const projectSheets = sheetsOverride ?? project.data.sheets;
        const currentProjectFolderPath = constructPath([
          bucket,
          projectFoldersRootPrefix,
          parentPath,
          projectName,
        ]);
        const projectFolderTargetPath = constructPath([
          targetBucket,
          projectFoldersRootPrefix,
          targetPath,
          targetProjectName,
        ]);
        const updatedProjectSheets = updateFilesPathInputsInProject(
          projectSheets,
          currentProjectFolderPath,
          projectFolderTargetPath,
        );

        onProgress?.(20);

        const settingsToAdd: ProjectState['settings'] = {
          [projectMetadataSettingsKey]: {
            ...(project.data.settings?.[projectMetadataSettingsKey] ?? {}),
            [forkedProjectMetadataKey]: {
              bucket,
              path: parentPath,
              projectName,
            },
          },
        };

        const createdProjectRes = await createProject({
          projectName: targetProjectName,
          bucket: targetBucket,
          path: targetPath,
          initialProjectData: updatedProjectSheets.reduce(
            (acc, curr) => {
              acc[curr.sheetName] = curr.content;

              return acc;
            },
            {} as Record<string, string>,
          ),
          skipFolderCreation: true,
          settingsToAdd,
        });

        onProgress?.(30);

        if (!createdProjectRes.success) {
          if (!suppressErrors) {
            displayToast('error', apiMessages.cloneProjectServer);
          }

          return {
            success: false,
            error: createdProjectRes.error,
          };
        }

        const projectFilesFromSheets = (collectFilesFromProject(
          projectSheets.map((sheet) => sheet.content),
        )
          ?.map(convertUrlToMetadata)
          .filter(Boolean) ?? []) as Pick<
          ResourceMetadata,
          'bucket' | 'parentPath' | 'name'
        >[];

        const projectFilesRes = await getFiles({
          path:
            constructPath([
              bucket,
              projectFoldersRootPrefix,
              parentPath,
              projectName,
            ]) + '/',
          isRecursive: true,
        });
        const projectFiles = projectFilesRes.success
          ? projectFilesRes.data
          : [];

        onProgress?.(40);

        if (!projectFilesRes.success) {
          if (suppressErrors)
            return {
              success: true,
              data: { newClonedProjectName: targetProjectName },
            };

          displayToast('error', apiMessages.cloneProjectServer);

          return {
            success: false,
            error: projectFilesRes.error,
          };
        }

        const projectFilesFullPaths = projectFiles.map((file) =>
          constructPath([file.bucket, file.parentPath, file.name]),
        );
        const projectFilesUniqueInSheets = projectFilesFromSheets.filter(
          (file) => {
            const fullPath = constructPath([
              file.bucket,
              file.parentPath,
              file.name,
            ]);

            return !projectFilesFullPaths.includes(fullPath);
          },
        );
        const projectFilesToClone =
          projectFilesUniqueInSheets.concat(projectFiles);

        const projectRootPath = constructPath([
          projectFoldersRootPrefix,
          parentPath,
          projectName,
        ]);

        let currentFileIndex = 0;
        const totalFilesToClone = projectFilesToClone.length;
        for (const file of projectFilesToClone) {
          onProgress?.(50 + (30 * currentFileIndex) / totalFilesToClone);
          currentFileIndex++;

          const relativeParentPath =
            file.parentPath && file.parentPath.startsWith(projectRootPath)
              ? file.parentPath
                  .slice(projectRootPath.length)
                  .replace(/^\/+/, '')
              : '';

          await cloneFile({
            bucket: file.bucket,
            name: file.name,
            parentPath: file.parentPath,
            targetPath: constructPath([
              projectFoldersRootPrefix,
              targetPath,
              targetProjectName,
              relativeParentPath,
            ]),
            targetBucket,
            suppressErrors: true,
          });
        }

        onProgress?.(80);

        await cloneProjectConversations({
          bucket,
          name,
          parentPath,
          suppressErrors,
          targetPath,
          targetBucket,
          projectName,
          targetProjectName,
          isReadOnly,
        });

        onProgress?.(100);

        return {
          success: true,
          data: { newClonedProjectName: targetProjectName },
        };
      } catch (error) {
        if (!suppressErrors) displayToast('error', apiMessages.cloneFileClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.cloneFileClient),
        };
      }
    },
    [
      cloneProjectConversations,
      cloneFile,
      createProject,
      getFiles,
      getProject,
      userBucket,
    ],
  );

  // Used SSE for response, so it should be handled on calling side
  const getProjectFileNotifications = useCallback<
    ApiRequestFunctionWithError<
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

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.subscribeToProjectServer,
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: res,
        };
      } catch (e) {
        // This error appears when browser tries to cancel pending request, handle it on level above
        if (e instanceof TypeError && e.message === 'Failed to fetch') {
          throw e;
        }
        displayToast('error', apiMessages.subscribeToProjectClient);

        return {
          success: false,
          error: classifyFetchError(e, apiMessages.subscribeToProjectClient),
        };
      }
    },
    [sendDialRequest],
  );

  /**
   * Reset a project to the state of the source project without removing the project yaml.
   */
  const resetProject = useCallback<
    ApiRequestFunctionWithError<
      {
        bucket: string;
        path?: string | null;
        projectName: string;
        sourceBucket: string;
        sourcePath: string;
        sourceName: string;
      },
      ProjectState
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
        parentPath: path,
        name: projectName,
      });
      if (!currentProject.success) {
        return {
          success: false,
          error: currentProject.error,
        };
      }

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
        parentPath: sourcePath,
        name: sourceName,
      });
      if (!sourceProject.success) {
        return {
          success: false,
          error: sourceProject.error,
        };
      }

      const currentFolderPath = constructPath([
        bucket,
        projectFoldersRootPrefix,
        path,
        projectName,
      ]);
      const sourceFolderPath = constructPath([
        sourceBucket,
        projectFoldersRootPrefix,
        sourcePath,
        sourceName,
      ]);
      const updatedSheets = updateFilesPathInputsInProject(
        sourceProject.data.sheets,
        sourceFolderPath,
        currentFolderPath,
      );

      const updatedProject = await putProject({
        ...currentProject.data,
        sheets: updatedSheets,
        settings: {
          ...currentProject.data.settings,
          [projectMetadataSettingsKey]: {
            [forkedProjectMetadataKey]: {
              bucket: sourceBucket,
              path: sourcePath,
              projectName: sourceName,
            },
          },
        },
      });
      if (!updatedProject.success) {
        return {
          success: false,
          error: updatedProject.error,
        };
      }

      /* Gather all files from source project and clone them */
      const srcFolderFilesRes = await getFiles({
        path:
          constructPath([
            sourceBucket,
            projectFoldersRootPrefix,
            sourcePath,
            sourceName,
          ]) + '/',
        isRecursive: true,
      });

      const srcFolderFiles = srcFolderFilesRes.success
        ? srcFolderFilesRes.data
        : [];

      const extraFiles =
        (collectFilesFromProject(
          sourceProject.data.sheets.map((s) => s.content),
        )
          ?.map(convertUrlToMetadata)
          .filter(Boolean) as Pick<
          ResourceMetadata,
          'bucket' | 'parentPath' | 'name'
        >[]) ?? [];

      const filesToClone = [...srcFolderFiles, ...extraFiles];

      for (const file of filesToClone) {
        await cloneFile({
          bucket: file.bucket,
          name: file.name,
          parentPath: file.parentPath,
          targetBucket: bucket,
          targetPath: constructPath([
            projectFoldersRootPrefix,
            path,
            projectName,
          ]),
          suppressErrors: true,
        });
      }

      return {
        success: true,
        data: updatedProject.data,
      };
    },
    [getProject, deleteFolder, putProject, getFiles, cloneFile],
  );

  const updateForkedProjectMetadata = useCallback<
    ApiRequestFunctionWithError<
      {
        bucket: string;
        path?: string | null;
        projectName: string;
        forkBucket: string;
        forkPath?: string | null;
        forkProjectName: string;
        suppressErrors?: boolean;
      },
      ProjectState
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
        const current = await getProject({
          bucket,
          parentPath: path,
          name: projectName,
        });
        if (!current.success) {
          return {
            success: false,
            error: current.error,
          };
        }

        const updatedSettings: ProjectState['settings'] = {
          ...(current.data.settings ?? {}),
          [projectMetadataSettingsKey]: {
            ...(current.data.settings?.[projectMetadataSettingsKey] ?? {}),
            [forkedProjectMetadataKey]: {
              bucket: forkBucket,
              path: forkPath,
              projectName: forkProjectName,
            },
          },
        };

        const updated = await putProject({
          ...current.data,
          settings: updatedSettings,
        });

        if (!updated.success && !suppressErrors) {
          displayToast('error', apiMessages.putProjectServer);
        }

        return updated;
      } catch (error) {
        if (!suppressErrors) {
          displayToast('error', apiMessages.putProjectClient);
        }

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.putProjectClient),
        };
      }
    },
    [getProject, putProject],
  );

  return {
    getProject,
    getFlatUserProjects,
    createProject,
    putProject,
    deleteProject,
    cloneProject,
    moveProject,
    renameProject,
    getProjectFileNotifications,
    resetProject,
    updateForkedProjectMetadata,
    checkProjectExists,
  };
};
