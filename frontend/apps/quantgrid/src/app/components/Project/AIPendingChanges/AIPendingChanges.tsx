import { Button } from 'antd';
import classNames from 'classnames';
import { useCallback, useContext } from 'react';

import Icon from '@ant-design/icons';
import {
  ExclamationCircleIcon,
  secondaryOutlineInvertedButtonClasses,
} from '@frontend/common';
import { GridEvent } from '@frontend/spreadsheet';

import { ProjectContext } from '../../../context';
import { useGridApi } from '../../../hooks';

export const AIPendingChangesBanner = () => {
  const { isAIPendingChanges, isAIPendingBanner } = useContext(ProjectContext);
  const api = useGridApi();

  const handleExpandAIPrompt = useCallback(() => {
    api?.event.emit({
      type: GridEvent.expandAIPrompt,
    });
  }, [api?.event]);

  if (!isAIPendingChanges || !isAIPendingBanner) return null;

  return (
    <div className="flex gap-3 bg-bgAccentTertiary px-4 py-1 text-textInverted text-xs items-center justify-between">
      <div className="flex gap-3 items-center">
        <span>
          <Icon
            className="w-[18px]"
            component={() => <ExclamationCircleIcon />}
          ></Icon>
        </span>
        <span>You have pending AI edits.</span>
        <Button
          className={classNames(
            secondaryOutlineInvertedButtonClasses,
            'px-1 py-0.5 text-xs h-6'
          )}
          onClick={handleExpandAIPrompt}
        >
          Open AI changes
        </Button>
      </div>
    </div>
  );
};
