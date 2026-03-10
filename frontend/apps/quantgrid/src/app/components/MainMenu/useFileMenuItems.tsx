import { ItemType } from 'antd/es/menu/interface';
import { useMemo } from 'react';

import Icon from '@ant-design/icons';
import {
  disabledTooltips,
  FileIcon,
  getDropdownDivider,
  getDropdownItem,
  getDropdownMenuKey,
  MenuItem,
  QGLogo,
  ResourcePermission,
  Shortcut,
  shortcutApi,
} from '@frontend/common/lib';

import { RecentProject } from '../../services';
import { editMenuKeys, fileMenuKeys } from './constants';

export const useFileMenuItems = ({
  isDefaultMode,
  recentProjects,
  permissions,
  isYourProject,
  isProjectReadonlyByUser,
  isProjectShareable,
  isOpen,
}: {
  isYourProject: boolean;
  isProjectShareable: boolean;
  permissions: ResourcePermission[];
  isAIPendingChanges: boolean;
  isDefaultMode: boolean;
  recentProjects: RecentProject[];
  isProjectReadonlyByUser: boolean;
  isOpen: boolean;
}): MenuItem => {
  const fileMenuItem = useMemo(() => {
    const fileMenuPath = ['FileMenu'];
    const openProjectPath = [...fileMenuPath, 'OpenProject'];

    return {
      label: 'File',
      key: 'FileMenu',
      icon: (
        <Icon
          className="text-text-secondary w-[18px]"
          component={() => <FileIcon />}
        />
      ),
      children: isOpen
        ? [
            getDropdownItem({
              label: 'Create project',
              fullPath: [...fileMenuPath, 'CreateProject'],
              key: fileMenuKeys.createProject,
              shortcut: shortcutApi.getLabel(Shortcut.NewProject),
            }),
            getDropdownItem({
              label: 'Create worksheet',
              fullPath: [...fileMenuPath, 'CreateWorksheet'],
              key: fileMenuKeys.createWorksheet,
              disabled: !isDefaultMode,
              tooltip: disabledTooltips.notAllowedChanges,
            }),
            getDropdownDivider(),
            getDropdownItem({
              label: 'Open project',
              key: 'OpenProjectParent',
              fullPath: openProjectPath,
              children: [
                ...recentProjects.map((recentProject) =>
                  getDropdownItem({
                    label: (
                      <div className="flex items-center truncate gap-2">
                        <Icon
                          className="w-[18px]"
                          component={() => <QGLogo />}
                        />
                        {recentProject.projectName}
                      </div>
                    ),
                    fullPath: [
                      ...openProjectPath,
                      recentProject.projectName ?? 'recent',
                    ],
                    key: getDropdownMenuKey(
                      fileMenuKeys.openProject,
                      recentProject,
                    ),
                  }),
                ),
                recentProjects.length ? getDropdownDivider() : undefined,
                getDropdownItem({
                  label: 'View all projects',
                  fullPath: [...openProjectPath, 'ViewAllProjects'],
                  key: fileMenuKeys.viewAllProjects,
                }),
              ].filter(Boolean) as ItemType[],
            }),
            getDropdownDivider(),
            permissions.includes('WRITE') // We need to show this only for possible editable projects
              ? getDropdownItem({
                  label: isProjectReadonlyByUser
                    ? 'Make project editable'
                    : 'Make project readonly',
                  fullPath: [...fileMenuPath, 'MakeReadonly'],
                  key: fileMenuKeys.makeReadonly,
                })
              : undefined,
            getDropdownItem({
              label: 'Rename project',
              fullPath: [...fileMenuPath, 'RenameProject'],
              key: editMenuKeys.renameProject,
              disabled: !isYourProject,
              tooltip: !isYourProject
                ? disabledTooltips.notAllowedRename
                : undefined,
            }),
            getDropdownItem({
              label: 'Delete project',
              fullPath: [...fileMenuPath, 'DeleteProject'],
              key: fileMenuKeys.deleteProject,
              disabled: !isYourProject,
              tooltip: !isYourProject
                ? disabledTooltips.notAllowedDelete
                : undefined,
            }),
            getDropdownDivider(),
            getDropdownItem({
              label: 'Share project',
              fullPath: [...fileMenuPath, 'ShareProject'],
              key: fileMenuKeys.shareProject,
              disabled: !isProjectShareable,
              tooltip: !isProjectShareable
                ? disabledTooltips.notAllowedShare
                : undefined,
            }),
            getDropdownItem({
              label: 'Clone project',
              fullPath: [...fileMenuPath, 'CloneProject'],
              key: fileMenuKeys.cloneProject,
            }),
            getDropdownItem({
              label: 'Download project',
              fullPath: [...fileMenuPath, 'DownloadProject'],
              key: fileMenuKeys.downloadProject,
            }),
            getDropdownDivider(),
            getDropdownItem({
              label: 'Back to projects',
              fullPath: [...fileMenuPath, 'CloseProject'],
              key: fileMenuKeys.closeProject,
            }),
          ]
        : [],
    };
  }, [
    isOpen,
    isDefaultMode,
    isProjectReadonlyByUser,
    isProjectShareable,
    isYourProject,
    permissions,
    recentProjects,
  ]);

  return fileMenuItem;
};
