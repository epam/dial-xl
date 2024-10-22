import { Tooltip } from 'antd';
import cx from 'classnames';
import { useContext } from 'react';

import Icon from '@ant-design/icons';
import { ClearIcon, iconClasses } from '@frontend/common';

import { PanelProps } from '../../../common';
import { UndoRedoContext } from '../../../context';
import { History } from '../History';
import { PanelToolbar } from '../PanelToolbar';
import { PanelWrapper } from './PanelWrapper';

export const UndoRedoPanel = ({ panelName, title, position }: PanelProps) => {
  const { clear } = useContext(UndoRedoContext);

  return (
    <PanelWrapper>
      <PanelToolbar panelName={panelName} position={position} title={title}>
        <Tooltip placement="bottom" title="Clear history">
          <Icon
            className={cx('w-[16px]', iconClasses)}
            component={() => <ClearIcon />}
            onClick={clear}
          />
        </Tooltip>
      </PanelToolbar>
      <History />
    </PanelWrapper>
  );
};
