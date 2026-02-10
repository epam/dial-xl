import { Modal } from 'antd';
import classNames from 'classnames';
import { useCallback, useContext, useMemo } from 'react';

import {
  modalFooterButtonClasses,
  primaryButtonClasses,
} from '@frontend/common';

import { ApiContext, DashboardContext } from '../../../context';
import { useProjectActions } from '../../../hooks';

export const useDashboardActions = (projects: string[]) => {
  const { isAdmin, userBucket } = useContext(ApiContext);
  const {
    createEmptyFolder,
    folderPath: urlFolderPath,
    folderBucket: urlBucket,
    currentTab,
    refetchData,
    uploadFiles,
  } = useContext(DashboardContext);
  const { createProjectAction } = useProjectActions();

  const useUserRoot = useMemo(() => {
    return (
      currentTab === 'recent' ||
      currentTab === 'sharedByMe' ||
      currentTab === 'sharedWithMe' ||
      (currentTab === 'examples' && !isAdmin)
    );
  }, [currentTab, isAdmin]);

  const folderPath = useMemo(() => {
    return useUserRoot ? undefined : urlFolderPath;
  }, [useUserRoot, urlFolderPath]);

  const bucket = useMemo(() => {
    return useUserRoot ? userBucket : urlBucket ?? userBucket;
  }, [useUserRoot, userBucket, urlBucket]);

  const handleCreateNewProject = useCallback(() => {
    if (!bucket) return;

    const action = () => {
      createProjectAction({
        path: folderPath,
        bucket: bucket,
        openInNewTab: true,
        existingProjectNames: projects,
        onSuccess: () => {
          if (
            (bucket === urlBucket && folderPath === urlFolderPath) ||
            (bucket === userBucket && !folderPath && currentTab === 'home')
          ) {
            refetchData();
          }
        },
      });
    };

    if (useUserRoot) {
      Modal.warning({
        icon: null,
        title: 'Project will be created in your files',
        content: `You can't create projects in this shared section. The project will be created in your “My Files” instead.`,
        okButtonProps: {
          className: classNames(modalFooterButtonClasses, primaryButtonClasses),
        },
        onOk: action,
      });

      return;
    }

    action();
  }, [
    bucket,
    createProjectAction,
    currentTab,
    folderPath,
    projects,
    refetchData,
    urlBucket,
    urlFolderPath,
    useUserRoot,
    userBucket,
  ]);

  const handleCreateEmptyFolder = useCallback(() => {
    if (!bucket) return;

    const action = () => {
      createEmptyFolder({ path: folderPath ?? null, bucket });
    };

    if (useUserRoot) {
      Modal.warning({
        icon: null,
        title: 'Folder will be created in your files',
        content: `You can't create folder in this shared section. The folder will be created in your “My Files” instead.`,
        okButtonProps: {
          className: classNames(modalFooterButtonClasses, primaryButtonClasses),
        },
        onOk: action,
      });

      return;
    }

    action();
  }, [bucket, createEmptyFolder, folderPath, useUserRoot]);

  const handleUploadFiles = useCallback(
    (files?: FileList) => {
      if (!bucket) return;

      const action = () => {
        uploadFiles(folderPath ?? null, bucket, files);
      };

      if (useUserRoot) {
        Modal.warning({
          icon: null,
          title: 'File(s) will be uploaded in your files',
          content: `You can't upload files to this shared section. The file will be uploaded to your “My Files” instead.`,
          okButtonProps: {
            className: classNames(
              modalFooterButtonClasses,
              primaryButtonClasses
            ),
          },
          onOk: action,
        });

        return;
      }

      action();
    },
    [bucket, folderPath, uploadFiles, useUserRoot]
  );

  return { handleCreateNewProject, handleUploadFiles, handleCreateEmptyFolder };
};
