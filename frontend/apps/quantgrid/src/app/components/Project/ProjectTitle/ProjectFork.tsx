import { Dropdown, MenuProps } from 'antd';
import cx from 'classnames';
import { useCallback, useContext, useMemo, useState } from 'react';

import Icon from '@ant-design/icons';
import {
  dialProjectFileExtension,
  ForkExclamationIcon,
  ForkIcon,
  getDropdownItem,
  QGLogo,
  ReloadIcon,
  SettingsIcon,
} from '@frontend/common';

import { ProjectContext } from '../../../context';
import { useApiRequests, useResetProject } from '../../../hooks';
import { getProjectNavigateUrl } from '../../../utils';
import { SelectFile } from '../../Modals';

interface Props {
  className: string;
}

export function ProjectFork({ className }: Props) {
  const { forkedProject, projectBucket, projectPath, projectName } =
    useContext(ProjectContext);
  const { resetProject } = useResetProject();
  const { updateForkedProjectMetadata } = useApiRequests();
  const [isMenuOpened, setIsMenuOpened] = useState(false);
  const [isSelectProjectOpen, setIsSelectProjectOpen] = useState(false);

  const forkedProjectLink = useMemo((): string => {
    if (!forkedProject) return '';

    return getProjectNavigateUrl({
      projectBucket: forkedProject.bucket,
      projectPath: forkedProject.path,
      projectName: forkedProject.projectName,
    });
  }, [forkedProject]);

  const handleSelectProject = useCallback(
    (path: string | null | undefined, bucket: string, name: string) => {
      setIsSelectProjectOpen(false);

      if (!projectBucket || projectPath === null || !projectName) return;

      updateForkedProjectMetadata({
        bucket: projectBucket,
        path: projectPath,
        projectName,
        forkPath: path,
        forkBucket: bucket,
        forkProjectName: name.endsWith(dialProjectFileExtension)
          ? name.slice(0, -dialProjectFileExtension.length)
          : name,
      });
    },
    [projectBucket, projectName, projectPath, updateForkedProjectMetadata]
  );

  const items: MenuProps['items'] = forkedProject?.isExists
    ? [
        getDropdownItem({
          key: 'goTo',
          label: 'Go to base project',
          icon: <Icon className="w-[18px]" component={() => <QGLogo />} />,
          onClick: () =>
            window.open(forkedProjectLink, '_blank', 'noopener,noreferrer'),
        }),
        getDropdownItem({
          key: 'reset',
          label: 'Reset to base project',
          icon: (
            <Icon
              className="text-textSecondary w-[18px]"
              component={() => <ReloadIcon />}
            />
          ),
          onClick: resetProject,
        }),
      ]
    : [
        getDropdownItem({
          key: 'restore',
          label: 'Restore connection to base project',
          icon: (
            <Icon
              className="w-[18px] text-textSecondary"
              component={() => <SettingsIcon />}
            />
          ),
          onClick: () => setIsSelectProjectOpen(true),
        }),
      ];

  return (
    <>
      <Dropdown
        className="h-full flex items-center"
        menu={{ items }}
        open={isMenuOpened}
        onOpenChange={setIsMenuOpened}
      >
        <Icon
          className={cx(
            'ml-2 h-[18px] w-[18px] cursor-pointer hover:opacity-80',
            forkedProject?.isExists ? className : 'text-textError'
          )}
          component={() =>
            forkedProject?.isExists ? <ForkIcon /> : <ForkExclamationIcon />
          }
        />
      </Dropdown>
      {isSelectProjectOpen && (
        <SelectFile
          fileExtensions={[dialProjectFileExtension]}
          initialBucket={projectBucket || ''}
          initialPath={projectPath}
          modalTitle="Select project to restore connection"
          okButtonText="Select project"
          onCancel={() => setIsSelectProjectOpen(false)}
          onOk={handleSelectProject}
        />
      )}
    </>
  );
}
