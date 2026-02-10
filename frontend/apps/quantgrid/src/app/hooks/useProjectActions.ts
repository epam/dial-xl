import { useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import {
  appMessages,
  defaultProjectName,
  dialProjectFileExtension,
  MetadataNodeType,
} from '@frontend/common';

import { WithCustomProgressBar } from '../components';
import { ApiContext, ProjectContext } from '../context';
import {
  createUniqueFileName,
  deleteProjectHistory,
  deleteRecentProjectFromRecentProjects,
} from '../services';
import {
  useChangeNameModalStore,
  useDeleteModalStore,
  useNewProjectModalStore,
  useShareFilesModalStore,
  useUIStore,
} from '../store';
import {
  displayToast,
  getProjectNavigateUrl,
  isEntityNameInvalid,
} from '../utils';
import { useApiRequests } from './useApiRequests';
import { useRenameFile } from './useRenameFile';

export function useProjectActions() {
  const setLoading = useUIStore((s) => s.setLoading);
  const { downloadFiles } = useApiRequests();
  const {
    projectName,
    sheetName,
    projectSheets,
    closeCurrentProject,
    projectBucket,
    projectPath,
    isProjectEditable,
    unsubscribeFromCurrentProject,
  } = useContext(ProjectContext);
  const { userBucket } = useContext(ApiContext);
  const { renameFile } = useRenameFile();
  const navigate = useNavigate();

  const {
    cloneProject: cloneProjectRequest,
    getFiles: getFilesRequest,
    createProject: createProjectRequest,
    deleteProject: deleteProjectRequest,
  } = useApiRequests();

  const closeProjectAction = useCallback(() => {
    if (projectName) {
      closeCurrentProject();
    }
  }, [closeCurrentProject, projectName]);

  const deleteProjectAction = useCallback(
    async ({
      silent,
      bucket,
      projectNameToRemove,
      path,
      onSuccess,
    }: {
      silent?: boolean;
      bucket: string;
      projectNameToRemove: string;
      path: string | null | undefined;
      onSuccess?: () => void;
    }) => {
      if (!silent) {
        const open = useDeleteModalStore.getState().open;

        const result = await open({
          contentText: `Do you want to remove project "${projectNameToRemove}"?`,
        });

        if (result) {
          deleteProjectAction({
            projectNameToRemove,
            bucket,
            path,
            silent: true,
            onSuccess,
          });
        }

        return;
      }

      setLoading(true);

      const res = await deleteProjectRequest({
        name: projectNameToRemove,
        bucket,
        parentPath: path,
      });

      setLoading(false);
      if (res) {
        deleteProjectHistory(projectNameToRemove, bucket, path);
        deleteRecentProjectFromRecentProjects(
          projectNameToRemove,
          bucket,
          path
        );

        if (projectNameToRemove === projectName) {
          // eslint-disable-next-line no-console
          console.warn(
            'Redirect to home because project which removed is opened in that moment'
          );
          closeCurrentProject();
        }
      }

      onSuccess?.();

      return {};
    },
    [closeCurrentProject, deleteProjectRequest, projectName, setLoading]
  );

  const deleteCurrentProjectAction = useCallback(
    async ({ silent }: { silent?: boolean } = {}) => {
      if (!projectBucket || !projectName) return;

      unsubscribeFromCurrentProject();

      await deleteProjectAction({
        projectNameToRemove: projectName,
        bucket: projectBucket,
        path: projectPath,
        silent,
      });
    },
    [
      deleteProjectAction,
      projectBucket,
      projectName,
      projectPath,
      unsubscribeFromCurrentProject,
    ]
  );

  const renameProjectAction = useCallback(
    async ({
      newName = defaultProjectName,
      silent,
    }: {
      newName?: string;
      silent?: boolean;
    } = {}) => {
      if (!projectBucket || !projectName || projectName === newName) return;

      if (!silent) {
        const open = useChangeNameModalStore.getState().open;

        const result = await open({
          kind: 'renameProject',
          initialName: projectName,
          validate: (name) => {
            if (!name) return 'Project name is required';
            if (isEntityNameInvalid(name)) return 'Invalid characters';

            return;
          },
        });

        if (result) {
          renameProjectAction({ newName: result, silent: true });
        }

        return;
      }

      unsubscribeFromCurrentProject();

      const renameRes = await renameFile({
        name: `${projectName}${dialProjectFileExtension}`,
        bucket: projectBucket,
        parentPath: projectPath,
        newName,
      });

      if (!renameRes) {
        displayToast('error', `Renaming of project to "${newName}" failed`);
        // eslint-disable-next-line no-console
        console.warn(
          'Redirect to home because renaming of current project failed'
        );
        closeCurrentProject();

        return;
      }

      closeCurrentProject(true);

      navigate(
        getProjectNavigateUrl({
          projectName: newName,
          projectBucket,
          projectPath,
          projectSheetName: sheetName,
        }),
        {
          replace: true,
        }
      );
    },
    [
      projectBucket,
      projectName,
      unsubscribeFromCurrentProject,
      renameFile,
      projectPath,
      closeCurrentProject,
      navigate,
      sheetName,
    ]
  );

  const createProjectAction = useCallback(
    async ({
      newName,
      path,
      bucket,
      existingProjectNames,
      silent,
      onSuccess,
      openInNewTab = true,
    }: {
      path?: string | null;
      bucket?: string | null;
      newName?: string;
      existingProjectNames?: string[];
      silent?: boolean;
      onSuccess?: () => void;
      openInNewTab?: boolean;
    } = {}) => {
      if (!userBucket) return;

      if (!silent) {
        const open = useNewProjectModalStore.getState().open;

        const result = await open({
          path,
          bucket: bucket ?? userBucket,
          existingProjectNames,
        });

        if (result) {
          createProjectAction({
            newName: result.name,
            path: result.path,
            bucket: result.bucket,
            silent: true,
            onSuccess,
            openInNewTab,
          });
        }

        return;
      }

      if (!userBucket) return;

      setLoading(true);

      const newProjectName = newName ?? defaultProjectName;
      const res = await createProjectRequest({
        bucket: bucket ?? userBucket,
        projectName: newName ?? defaultProjectName,
        path,
      });

      setLoading(false);

      if (res && openInNewTab) {
        window.open(
          getProjectNavigateUrl({
            projectBucket: bucket ?? userBucket,
            projectName: newProjectName,
            projectPath: path,
          }),
          '_blank'
        );
      }

      onSuccess?.();
    },
    [createProjectRequest, setLoading, userBucket]
  );

  const getFileNamesInFolder = useCallback(async () => {
    const allFilesInDestination = await getFilesRequest({
      path: `${projectBucket}/${projectPath ? projectPath + '/' : ''}`,
      suppressErrors: true,
    });

    return (allFilesInDestination ?? [])
      .filter((f) => f.nodeType !== MetadataNodeType.FOLDER)
      .map((file) => file.name);
  }, [getFilesRequest, projectBucket, projectPath]);

  const cloneCurrentProjectAction = useCallback(
    async ({
      newName,
      silent = false,
    }: {
      newName?: string;
      silent?: boolean;
    } = {}) => {
      if (
        !projectBucket ||
        !projectName ||
        !userBucket ||
        projectName === newName
      )
        return;

      if (!silent) {
        const open = useChangeNameModalStore.getState().open;

        const fileNamesInDestination = await getFileNamesInFolder();
        const targetName = fileNamesInDestination.includes(
          projectName + dialProjectFileExtension
        )
          ? createUniqueFileName(projectName, fileNamesInDestination)
          : projectName;

        const result = await open({
          kind: 'cloneProject',
          initialName: targetName,
          validate: (name) => {
            if (!name) return 'New name is required';
            if (isEntityNameInvalid(name)) return 'Invalid characters';
            if (name === projectName) return 'New name should be different';

            return;
          },
        });

        if (result) {
          cloneCurrentProjectAction({
            newName: result,
            silent: true,
          });
        }

        return;
      }

      const uploadingToast = toast(WithCustomProgressBar, {
        customProgressBar: true,
        data: {
          message: `Cloning project...`,
        },
      });

      const res = await cloneProjectRequest({
        bucket: projectBucket,
        name: projectName + dialProjectFileExtension,
        parentPath: projectPath,
        targetBucket: userBucket,
        targetPath: null,
        sheetsOverride: projectSheets,
        isReadOnly: !isProjectEditable,
        newName,
        onProgress: (progress: number) => {
          toast.update(uploadingToast, {
            progress: progress / 100,
          });
        },
      });

      toast.dismiss(uploadingToast);

      if (!res) return;

      displayToast(
        'success',
        appMessages.projectCloneSuccess(
          projectName,
          res.newClonedProjectName.replaceAll(dialProjectFileExtension, '')
        )
      );

      window.open(
        getProjectNavigateUrl({
          projectBucket: userBucket,
          projectName: res.newClonedProjectName.replaceAll(
            dialProjectFileExtension,
            ''
          ),
          projectPath: null,
          projectSheetName: sheetName,
        }),
        '_blank'
      );
    },
    [
      cloneProjectRequest,
      sheetName,
      getFileNamesInFolder,
      isProjectEditable,
      projectSheets,
      userBucket,
      projectName,
      projectBucket,
      projectPath,
    ]
  );

  const downloadCurrentProjectAction = useCallback(async () => {
    if (!projectBucket) return;

    toast.loading(`Downloading project...`);
    const result = await downloadFiles({
      files: [
        {
          bucket: projectBucket,
          name: `${projectName}${dialProjectFileExtension}`,
          parentPath: projectPath,
        },
      ],
    });
    toast.dismiss();
    if (!result) {
      toast.error('Error happened during downloading file');
    }
  }, [downloadFiles, projectBucket, projectName, projectPath]);

  const shareProjectAction = useCallback(() => {
    if (!projectName || !projectBucket) return;

    const projectFileName = projectName + dialProjectFileExtension;
    useShareFilesModalStore.getState().open([
      {
        name: projectFileName,
        bucket: projectBucket,
        parentPath: projectPath,
        nodeType: MetadataNodeType.ITEM,
        items: [],
      },
    ]);
  }, [projectBucket, projectName, projectPath]);

  return {
    renameProjectAction,
    deleteProjectAction,
    deleteCurrentProjectAction,
    createProjectAction,
    closeProjectAction,
    shareProjectAction,
    cloneCurrentProjectAction,
    downloadCurrentProjectAction,
  };
}
