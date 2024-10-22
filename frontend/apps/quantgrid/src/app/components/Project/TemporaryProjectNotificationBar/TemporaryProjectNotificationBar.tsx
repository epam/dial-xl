import { Button } from 'antd';
import classNames from 'classnames';
import { useContext, useMemo, useState } from 'react';

import Icon from '@ant-design/icons';
import {
  ClockExclamationIcon,
  CloseIcon,
  csvTempFolder,
  projectFoldersRootPrefix,
  secondaryOutlineInvertedButtonClasses,
} from '@frontend/common';

import { ProjectContext } from '../../../context';
import { constructPath } from '../../../utils';

export const TemporaryProjectNotificationBar = () => {
  const { cloneCurrentProject, projectPath } = useContext(ProjectContext);

  const [isHidden, setIsHidden] = useState(false);

  const isTemporaryOpenedProject = useMemo(
    () =>
      projectPath?.startsWith(
        constructPath([projectFoldersRootPrefix, csvTempFolder])
      ),
    [projectPath]
  );

  if (!isTemporaryOpenedProject || isHidden) return null;

  return (
    <div className="flex gap-3 bg-bgAccentTertiary px-4 py-1 text-textInverted text-xs items-center justify-between">
      <div className="flex gap-3 items-center">
        <span>
          <Icon
            className="w-[18px]"
            component={() => <ClockExclamationIcon />}
          ></Icon>
        </span>
        <span>TEMPORARY</span>
        <span>This project is temporary</span>
        <Button
          className={classNames(
            secondaryOutlineInvertedButtonClasses,
            'px-1 py-0.5 text-xs h-6'
          )}
          onClick={cloneCurrentProject}
        >
          Clone to my home
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
