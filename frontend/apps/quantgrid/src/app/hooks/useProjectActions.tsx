import { useCallback, useContext } from 'react';
import { useNavigate } from 'react-router';
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
  navigateWithToast,
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

        if (!result) return; // User cancelled - exit early
        // User confirmed - continue with deletion
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
          path,
        );

        if (projectNameToRemove === projectName) {
          // eslint-disable-next-line no-console
          console.warn(
            'Redirect to home because project which removed is opened in that moment',
          );
          closeCurrentProject();
        }
      }

      onSuccess?.();

      return {};
    },
    [closeCurrentProject, deleteProjectRequest, projectName, setLoading],
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
    ],
  );

  const renameProjectAction = useCallback(
    async ({
      newName = defaultProjectName,
      silent,
    }: {
      newName?: string;
      silent?: boolean;
    } = {}) => {
      if (!projectBucket || !projectName) return;

      let finalNewName = newName;

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

        if (!result) return; // User cancelled - exit early
        finalNewName = result; // Use modal result and continue
      }

      if (projectName === finalNewName) return;

      unsubscribeFromCurrentProject();

      const renameRes = await renameFile({
        name: `${projectName}${dialProjectFileExtension}`,
        bucket: projectBucket,
        parentPath: projectPath,
        newName: finalNewName,
      });

      if (!renameRes) {
        displayToast(
          'error',
          `Renaming of project to "${finalNewName}" failed`,
        );
        // eslint-disable-next-line no-console
        console.warn(
          'Redirect to home because renaming of current project failed',
        );
        closeCurrentProject();

        return;
      }

      closeCurrentProject(true);

      navigate(
        getProjectNavigateUrl({
          projectName: finalNewName,
          projectBucket,
          projectPath,
          projectSheetName: sheetName,
        }),
        {
          replace: true,
        },
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
    ],
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

      let finalNewName = newName;
      let finalPath = path;
      let finalBucket = bucket;

      if (!silent) {
        const open = useNewProjectModalStore.getState().open;

        const result = await open({
          path,
          bucket: bucket ?? userBucket,
          existingProjectNames,
        });

        if (!result) return; // User cancelled - exit early
        finalNewName = result.name;
        finalPath = result.path;
        finalBucket = result.bucket;
      }

      setLoading(true);

      const newProjectName = finalNewName ?? defaultProjectName;
      const res = await createProjectRequest({
        bucket: finalBucket ?? userBucket,
        projectName: finalNewName ?? defaultProjectName,
        path: finalPath,
      });

      setLoading(false);

      if (res && openInNewTab) {
        navigateWithToast(
          getProjectNavigateUrl({
            projectBucket: finalBucket ?? userBucket,
            projectName: newProjectName,
            projectPath: finalPath,
          }),
          appMessages.projectCreateSuccess(newProjectName),
        );
      }

      onSuccess?.();
    },
    [createProjectRequest, setLoading, userBucket],
  );

  const getFileNamesInFolder = useCallback(async () => {
    const allFilesInDestinationRes = await getFilesRequest({
      path: `${userBucket}/${projectPath ? projectPath + '/' : ''}`,
    });
    const allFilesInDestination = allFilesInDestinationRes.success
      ? allFilesInDestinationRes.data
      : [];

    return allFilesInDestination
      .filter((f) => f.nodeType !== MetadataNodeType.FOLDER)
      .map((file) => file.name);
  }, [getFilesRequest, projectPath, userBucket]);

  const cloneCurrentProjectAction = useCallback(
    async ({
      newName,
      silent = false,
    }: {
      newName?: string;
      silent?: boolean;
    } = {}) => {
      if (!projectBucket || !projectName || !userBucket) return;

      let finalNewName = newName;

      if (!silent) {
        const open = useChangeNameModalStore.getState().open;

        const fileNamesInDestination = await getFileNamesInFolder();
        const targetName = fileNamesInDestination.includes(
          projectName + dialProjectFileExtension,
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

        if (!result) return; // User cancelled - exit early
        finalNewName = result; // Use modal result and continue
      }

      if (projectName === finalNewName) return;

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
        newName: finalNewName,
        onProgress: (progress: number) => {
          toast.update(uploadingToast, {
            progress: progress / 100,
          });
        },
      });

      toast.dismiss(uploadingToast);

      if (!res) return;

      navigateWithToast(
        getProjectNavigateUrl({
          projectBucket: userBucket,
          projectName: res.newClonedProjectName.replaceAll(
            dialProjectFileExtension,
            '',
          ),
          projectPath: null,
          projectSheetName: sheetName,
        }),
        appMessages.projectCloneSuccess(
          res.newClonedProjectName.replaceAll(dialProjectFileExtension, ''),
        ),
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
    ],
  );

  const downloadCurrentProjectAction = useCallback(async () => {
    if (!projectBucket) return;

    const toastId = toast.loading(`Downloading project...`);
    const result = await downloadFiles({
      files: [
        {
          bucket: projectBucket,
          name: `${projectName}${dialProjectFileExtension}`,
          parentPath: projectPath,
        },
      ],
    });
    toast.dismiss(toastId);
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
