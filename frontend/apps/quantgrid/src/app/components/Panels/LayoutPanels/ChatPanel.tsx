import { Tooltip } from 'antd';
import cx from 'classnames';
import { useContext } from 'react';

import Icon from '@ant-design/icons';
import { DialChatLogoIcon, iconClasses } from '@frontend/common';

import { PanelProps } from '../../../common';
import { AppContext } from '../../../context';
import { ChatPanelView } from '../../ChatWrapper';
import { PanelToolbar } from '../PanelToolbar';
import { PanelWrapper } from './PanelWrapper';

export function ChatPanel({
  panelName,
  title,
  position,
  isActive,
}: PanelProps) {
  const { toggleChatWindowPlacement } = useContext(AppContext);

  return (
    <PanelWrapper isActive={isActive} panelName={panelName}>
      <PanelToolbar
        panelName={panelName}
        position={position}
        title={title}
        showExpand
      >
        <Tooltip placement="bottom" title="Move Chat to Window">
          <Icon
            className={cx(iconClasses, 'w-4')}
            component={() => <DialChatLogoIcon />}
            onClick={toggleChatWindowPlacement}
          />
        </Tooltip>
      </PanelToolbar>
      <ChatPanelView />
    </PanelWrapper>
  );
}
