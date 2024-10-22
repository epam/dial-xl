import { Button } from 'antd';
import classNames from 'classnames';
import { useContext, useMemo, useState } from 'react';

import Icon from '@ant-design/icons';
import {
  CloseIcon,
  EditOffIcon,
  secondaryOutlineInvertedButtonClasses,
} from '@frontend/common';

import { ProjectContext } from '../../../context';

export const ReadonlyNotificationBar = () => {
  const { projectPermissions, cloneCurrentProject } =
    useContext(ProjectContext);

  const [isHidden, setIsHidden] = useState(false);

  const isReadOnlyProject = useMemo(
    () => !projectPermissions.includes('WRITE'),
    [projectPermissions]
  );

  if (!isReadOnlyProject || isHidden) return null;

  return (
    <div className="flex gap-3 bg-bgAccentTertiary px-4 py-1 text-textInverted text-xs items-center justify-between">
      <div className="flex gap-3 items-center">
        <span>
          <Icon className="w-[18px]" component={() => <EditOffIcon />}></Icon>
        </span>
        <span>READ-ONLY</span>
        <span>You can only view the file without the ability to edit it</span>
        <Button
          className={classNames(
            secondaryOutlineInvertedButtonClasses,
            'px-1 py-0.5 text-xs h-6'
          )}
          onClick={cloneCurrentProject}
        >
          Clone to my projects
        </Button>
      </div>
      <button
        className="flex items-center text-textInverted hover:text-textPrimary"
        onClick={() => setIsHidden(true)}
      >
        <Icon className="w-[18px]" component={() => <CloseIcon />}></Icon>
      </button>
    </div>
  );
};
