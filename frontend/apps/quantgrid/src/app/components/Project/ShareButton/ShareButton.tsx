import { Button, Tooltip } from 'antd';
import classNames from 'classnames';
import { useContext } from 'react';

import {
  disabledTooltips,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
} from '@frontend/common';

import { ProjectContext } from '../../../context';
import { useProjectActions, useProjectMode } from '../../../hooks';

export function ShareButton() {
  const { isProjectShareable } = useContext(ProjectContext);
  const projectActions = useProjectActions();

  const { isAIPreviewMode, isCSVViewMode, isAIPendingMode } = useProjectMode();

  if (isAIPreviewMode || isCSVViewMode || isAIPendingMode) return null;

  return (
    <Tooltip
      placement="bottom"
      title={!isProjectShareable ? disabledTooltips.notAllowedShare : null}
    >
      <Button
        className={classNames(
          primaryButtonClasses,
          primaryDisabledButtonClasses,
          'h-7'
        )}
        disabled={!isProjectShareable}
        onClick={() => projectActions.shareProjectAction()}
      >
        Share
      </Button>
    </Tooltip>
  );
}
