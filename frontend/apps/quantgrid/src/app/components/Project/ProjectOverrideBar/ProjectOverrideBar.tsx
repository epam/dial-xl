import { Button } from 'antd';
import classNames from 'classnames';
import { useCallback, useContext } from 'react';

import Icon from '@ant-design/icons';
import {
  ExclamationCircleIcon,
  secondaryErrorButtonClasses,
} from '@frontend/common';

import { ProjectContext } from '../../../context';
import { useUnsavedChanges } from '../../../hooks';
import { removeLastProjectHistoryElement } from '../../../services';

export const ProjectOverrideBar = () => {
  const {
    isConflictResolving,
    resolveConflictUsingServerChanges,
    resolveConflictUsingLocalChanges,
    projectName,
    projectBucket,
    projectPath,
  } = useContext(ProjectContext);

  useUnsavedChanges(isConflictResolving);

  const handleDropChanges = useCallback(() => {
    if (!projectName || !projectBucket) return;

    removeLastProjectHistoryElement(projectName, projectBucket, projectPath);

    resolveConflictUsingServerChanges();
  }, [
    projectBucket,
    projectName,
    projectPath,
    resolveConflictUsingServerChanges,
  ]);

  if (!isConflictResolving) return null;

  return (
    <div className="flex gap-3 bg-bgError px-4 py-1 text-textError text-xs items-center justify-between">
      <div className="flex gap-3 items-center">
        <span>
          <Icon
            className="w-[18px]"
            component={() => <ExclamationCircleIcon />}
          ></Icon>
        </span>
        <span>Project content changed on server</span>
        <Button
          className={classNames(
            secondaryErrorButtonClasses,
            'px-1 py-0.5 text-xs h-6 text-textError'
          )}
          onClick={handleDropChanges}
        >
          Drop my changes
        </Button>
        <Button
          className={classNames(
            secondaryErrorButtonClasses,
            'px-1 py-0.5 text-xs h-6 text-textError'
          )}
          onClick={resolveConflictUsingLocalChanges}
        >
          Save anyway
        </Button>
      </div>
    </div>
  );
};
