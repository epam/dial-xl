import { useCallback } from 'react';
import { AuthContextProps } from 'react-oidc-context';
import { parse as yamlParse, stringify as yamlStringify } from 'yaml';

import {
  apiMessages,
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
import { ApiRequestFunction } from '../../types';
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
  updateFilesPathInputsInProject,
  updateMessagesProjectFoldersPath,
} from '../../utils';
import { useBackendRequest } from './useBackendRequests';
import { useConversationResourceRequests } from './useConversationsRequests';
import { useFileResourceRequests } from './useFileResourceRequests';

export const useProjectRequests = (
  auth: AuthContextProps,
  userBucket: string | undefined
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
    ApiRequestFunction<void, ResourceMetadata[]>
  >(async () => {
    if (!userBucket) return;

    const files = await getUserFiles({ isRecursive: true });

    if (!files) return files;

    const flatFiles = (
      files: ResourceMetadata[],
      acc: ResourceMetadata[]
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

    const flattedFiles = flatFiles(files, [] as ResourceMetadata[]);

    return flattedFiles;
  }, [getUserFiles, userBucket]);

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
          parentPath: constructPath([projectFoldersRootPrefix, path]),
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

  const checkProjectExists = useCallback<
    ApiRequestFunction<FileReference, boolean>
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
    async ({ bucket, parentPath = '', name }) => {
      try {
        const res = await sendDialRequest(
          encodeApiUrl(
            constructPath([
              filesEndpointPrefix,
              bucket,
              parentPath,
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

        return mapQGDialProjectToProject(
          data,
          name,
          bucket,
          parentPath,
          version
        );
      } catch {
        displayToast('error', apiMessages.getProjectClient);

        return undefined;
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
            constructPath([
              filesEndpointPrefix,
              projectData.bucket,
              projectData.path,
              projectData.projectName + dialProjectFileExtension,
            ])
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

        return undefined;
      }
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

        if (!conversations) return;

        const deleteJobs: Promise<unknown>[] = [];

        const queueDelete = (meta: ResourceMetadata) => {
          deleteJobs.push(
            deleteConversation(meta.bucket, meta.parentPath, meta.name)
          );
        };

        conversations.forEach(queueDelete);

        await Promise.all(deleteJobs);
      } catch {
        displayToast('error', apiMessages.deleteConversationClient);

        return;
      }
    },
    [deleteConversation, getConversations]
  );

  const deleteProject = useCallback<
    ApiRequestFunction<FileReference, unknown | undefined>
  >(
    async ({ bucket, parentPath = '', name }) => {
      try {
        // TODO: check escaping
        const res = await sendDialRequest(
          encodeApiUrl(
            `${filesEndpointPrefix}/${bucket}/${
              parentPath ? parentPath + '/' : ''
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
            parentPath ? parentPath + '/' : ''
          }${name}`,
          name: '',
          suppressErrors: true,
        });

        if (!deleteFolderRes) return;

        deleteProjectConversations({
          bucket,
          parentPath,
          name,
          projectName: name,
        });

        return {};
      } catch {
        displayToast('error', apiMessages.deleteProjectClient);

        return undefined;
      }
    },
    [deleteFolder, deleteProjectConversations, sendDialRequest]
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

        if (!conversations) return;

        const moveJobs: Promise<unknown>[] = [];

        const queueCopy = async (meta: ResourceMetadata) => {
          const conversationRes = await getConversation({
            ...meta,
            parentPath: meta.parentPath,
          });

          if (!conversationRes) return Promise.reject();

          const projectFolderTargetPath = constructPath([
            targetBucket,
            projectFoldersRootPrefix,
            targetPath,
            targetProjectName,
          ]);
          const replacedMessages = updateMessagesProjectFoldersPath(
            conversationRes.messages,
            projectFolderTargetPath
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
              ...conversationRes,
              messages: replacedMessages,
            },
          });

          if (!putConvRes) return Promise.reject();

          await deleteConversation(
            bucket,
            constructPath([
              bindConversationsRootFolder,
              parentPath,
              projectName,
            ]),
            meta.name
          );
        };

        conversations.forEach((conv) => moveJobs.push(queueCopy(conv)));

        await Promise.all(moveJobs);
      } catch {
        if (!suppressErrors)
          displayToast('error', apiMessages.moveConversationClient);

        return;
      }
    },
    [getConversations, getConversation, putConversation, deleteConversation]
  );

  const moveProject = useCallback<
    ApiRequestFunction<
      FileReference & {
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
      parentPath,
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
          parentPath: parentPath,
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
          parentPath,
        });

        if (!deleteProjectRes) {
          displayToast('error', apiMessages.moveToFolderServer);

          return undefined;
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
        });

        if (!projectFiles) {
          if (suppressErrors) return {};

          displayToast('error', apiMessages.moveToFolderServer);
        }

        moveProjectConversations({
          bucket,
          parentPath,
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

        return undefined;
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
        parentPath,
        targetBucket: bucket,
        targetPath: parentPath,
      });
    },
    [moveProject]
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

          if (!conversationRes) return Promise.reject();

          const projectFolderTargetPath = constructPath([
            targetBucket,
            projectFoldersRootPrefix,
            targetPath,
            targetProjectName,
          ]);
          const replacedMessages = updateMessagesProjectFoldersPath(
            conversationRes.messages,
            projectFolderTargetPath
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
              ...conversationRes,
              messages: replacedMessages,
            },
          });

          if (!putConvRes) return Promise.reject();
        };

        conversations.forEach((conv) => copyJobs.push(queueCopy(conv)));
        localConversations.forEach((conv) => copyJobs.push(queueCopy(conv)));

        await Promise.all(copyJobs);
      } catch {
        if (!suppressErrors)
          displayToast('error', apiMessages.cloneConversationsClient);

        return;
      }
    },
    [getConversation, getConversations, putConversation, userBucket]
  );

  const cloneProject = useCallback<
    ApiRequestFunction<
      FileReference & {
        suppressErrors?: boolean;
        targetPath: string | null;
        targetBucket: string;
        sheetsOverride?: WorksheetState[] | null;
        isReadOnly: boolean;
        newName?: string;
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
    }) => {
      try {
        const folderPath = `${targetBucket}/${
          targetPath ? targetPath + '/' : ''
        }`;
        const allFiles = await getFiles({
          path: folderPath,
        });

        const projectName = name.replace(dialProjectFileExtension, '');
        const project = await getProject({
          name: projectName,
          bucket,
          parentPath,
        });

        if (!project || !allFiles || !userBucket) {
          displayToast('error', apiMessages.cloneFileServer);

          return undefined;
        }
        const targetProjectFileName = createUniqueFileName(
          newName || name,
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
              path: parentPath,
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
          ResourceMetadata,
          'bucket' | 'parentPath' | 'name'
        >[];

        const projectFiles =
          (await getFiles({
            path:
              constructPath([
                bucket,
                projectFoldersRootPrefix,
                parentPath,
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
            parentPath: file.parentPath,
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
          parentPath,
          suppressErrors,
          targetPath,
          targetBucket,
          projectName,
          targetProjectName,
          isReadOnly,
        });

        return { newClonedProjectName: targetProjectName };
      } catch {
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

  // Used SSE for response, so it should be handled on calling side
  const getProjectFileNotifications = useCallback<
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

        return undefined;
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
        parentPath: path,
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
        parentPath: sourcePath,
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
        const current = await getProject({
          bucket,
          parentPath: path,
          name: projectName,
        });
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
