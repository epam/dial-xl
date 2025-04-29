import { MenuProps, Modal } from 'antd';
import classNames from 'classnames';
import { useCallback, useContext, useMemo } from 'react';

import Icon from '@ant-design/icons';
import {
  FolderPlusIcon,
  getDropdownDivider,
  getDropdownItem,
  modalFooterButtonClasses,
  primaryButtonClasses,
  QGLogo,
  UploadIcon,
} from '@frontend/common';

import { ApiContext, DashboardContext, ProjectContext } from '../../../context';

export const useDashboardCreateMenuItems = (projects: string[]) => {
  const { isAdmin, userBucket } = useContext(ApiContext);
  const { createProject } = useContext(ProjectContext);
  const {
    createEmptyFolder,
    folderPath: urlFolderPath,
    folderBucket: urlBucket,
    currentTab,
    refetchData,
    uploadFiles,
  } = useContext(DashboardContext);

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
      createProject({
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
        content: `You are not allowed to create project in current path and it will be created in your files root`,
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
    createProject,
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
        content: `You are not allowed to create folder in current path and it will be created in your files root`,
        okButtonProps: {
          className: classNames(modalFooterButtonClasses, primaryButtonClasses),
        },
        onOk: action,
      });

      return;
    }

    action();
  }, [bucket, createEmptyFolder, folderPath, useUserRoot]);

  const handleUploadFiles = useCallback(() => {
    if (!bucket) return;

    const action = () => {
      uploadFiles(folderPath ?? null, bucket);
    };

    if (useUserRoot) {
      Modal.warning({
        icon: null,
        title: 'File(s) will be uploaded in your files',
        content: `You are not allowed to upload files in current path and it will be uploaded in your files root`,
        okButtonProps: {
          className: classNames(modalFooterButtonClasses, primaryButtonClasses),
        },
        onOk: action,
      });

      return;
    }

    action();
  }, [bucket, folderPath, uploadFiles, useUserRoot]);

  const dropdownItems: MenuProps['items'] = useMemo(
    () =>
      [
        getDropdownItem({
          key: 'newProject',
          label: 'New project',
          icon: (
            <Icon
              className="stroke-transparent w-[18px] group-disabled:opacity-50"
              component={() => <QGLogo />}
            />
          ),
          onClick: handleCreateNewProject,
        }),
        getDropdownDivider(),
        getDropdownItem({
          key: 'newFolder',
          label: 'New folder',
          icon: (
            <Icon
              className={classNames(
                'w-[18px] text-textSecondary group-disabled:text-controlsTextDisable'
              )}
              component={() => <FolderPlusIcon />}
            />
          ),
          onClick: handleCreateEmptyFolder,
        }),
        getDropdownItem({
          key: 'uploadFile',
          label: 'Upload file',
          icon: (
            <Icon
              className={classNames(
                'w-[18px] text-textSecondary group-disabled:text-controlsTextDisable'
              )}
              component={() => <UploadIcon />}
            />
          ),
          onClick: handleUploadFiles,
        }),
      ].filter(Boolean) as MenuProps['items'],
    [handleCreateEmptyFolder, handleCreateNewProject, handleUploadFiles]
  );

  return { dropdownItems };
};
