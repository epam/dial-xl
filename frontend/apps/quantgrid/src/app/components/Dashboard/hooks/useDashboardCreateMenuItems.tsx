import { MenuProps } from 'antd';
import classNames from 'classnames';
import { useContext, useMemo } from 'react';

import Icon from '@ant-design/icons';
import {
  FolderPlusIcon,
  getDropdownDivider,
  getDropdownItem,
  publicBucket,
  QGLogo,
  UploadIcon,
} from '@frontend/common';

import { ApiContext, DashboardContext, ProjectContext } from '../../../context';

export const useDashboardCreateMenuItems = () => {
  const { isAdmin } = useContext(ApiContext);
  const { createProject } = useContext(ProjectContext);
  const {
    createEmptyFolder,
    folderPath,
    folderBucket,
    currentTab,
    refetchData,
    uploadFiles,
  } = useContext(DashboardContext);

  const isOptionsDisabled = useMemo(() => {
    return (
      currentTab === 'recent' ||
      ((currentTab === 'sharedByMe' || currentTab === 'sharedWithMe') &&
        !folderPath) ||
      (currentTab === 'examples' && !isAdmin)
    );
  }, [currentTab, folderPath, isAdmin]);

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
          disabled: isOptionsDisabled,
          tooltip: isOptionsDisabled
            ? 'You are not allowed to do it here'
            : undefined,
          onClick: () => {
            if (currentTab === 'examples') {
              createProject({
                path: folderPath,
                bucket: publicBucket,
                openInNewTab: true,
                onSuccess: () => refetchData(),
              });
            } else {
              createProject({
                path: folderPath,
                bucket: folderBucket,
                openInNewTab: true,
                onSuccess: () => refetchData(),
              });
            }
          },
        }),
        getDropdownDivider(),
        getDropdownItem({
          key: 'newFolder',
          label: 'New folder',
          disabled: isOptionsDisabled,
          tooltip: isOptionsDisabled
            ? 'You are not allowed to do it here'
            : undefined,
          icon: (
            <Icon
              className={classNames(
                'w-[18px] text-textSecondary group-disabled:text-controlsTextDisable'
              )}
              component={() => <FolderPlusIcon />}
            />
          ),
          onClick: () => createEmptyFolder(),
        }),
        getDropdownItem({
          key: 'uploadFile',
          label: 'Upload file',
          disabled: isOptionsDisabled,
          tooltip: isOptionsDisabled
            ? 'You are not allowed to do it here'
            : undefined,
          icon: (
            <Icon
              className={classNames(
                'w-[18px] text-textSecondary group-disabled:text-controlsTextDisable'
              )}
              component={() => <UploadIcon />}
            />
          ),
          onClick: () => uploadFiles(),
        }),
      ].filter(Boolean) as MenuProps['items'],
    [
      createEmptyFolder,
      createProject,
      currentTab,
      folderBucket,
      folderPath,
      isOptionsDisabled,
      refetchData,
      uploadFiles,
    ]
  );

  return { dropdownItems };
};
