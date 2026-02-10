import { MenuProps } from 'antd';
import classNames from 'classnames';
import { useMemo } from 'react';

import Icon from '@ant-design/icons';
import {
  FolderPlusIcon,
  getDropdownDivider,
  getDropdownItem,
  QGLogo,
  UploadIcon,
} from '@frontend/common';

import { useDashboardActions } from './useDashboardActions';

export const useDashboardCreateMenuItems = (projects: string[]) => {
  const { handleCreateEmptyFolder, handleCreateNewProject, handleUploadFiles } =
    useDashboardActions(projects);

  const dropdownItems: MenuProps['items'] = useMemo(
    () =>
      [
        getDropdownItem({
          key: 'newProject',
          label: 'Create new project',
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
          label: 'Create new folder',
          icon: (
            <Icon
              className={classNames(
                'w-[18px] text-text-secondary group-disabled:text-controls-text-disable'
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
                'w-[18px] text-text-secondary group-disabled:text-controls-text-disable'
              )}
              component={() => <UploadIcon />}
            />
          ),
          onClick: handleUploadFiles,
          shortcut: 'Or Drag & Drop',
        }),
      ].filter(Boolean) as MenuProps['items'],
    [handleCreateEmptyFolder, handleCreateNewProject, handleUploadFiles]
  );

  return { dropdownItems };
};
