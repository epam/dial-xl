import { Tooltip } from 'antd';
import classNames from 'classnames';
import { useContext } from 'react';

import Icon from '@ant-design/icons';
import { ExportIcon, iconClasses, ImportIcon } from '@frontend/common';

import { PanelProps } from '../../../common';
import { AIHintsContext } from '../../../context';
import { AIHints } from '../AIHints';
import { PanelToolbar } from '../PanelToolbar';
import { PanelWrapper } from './PanelWrapper';

export function AIHintsPanel({
  panelName,
  title,
  position,
  isActive,
}: PanelProps) {
  const { importAIHints, exportAIHints } = useContext(AIHintsContext);

  return (
    <PanelWrapper isActive={isActive} panelName={panelName}>
      <PanelToolbar panelName={panelName} position={position} title={title}>
        <Tooltip placement="bottom" title="Import AI Hints">
          <Icon
            className={classNames(iconClasses, 'w-4')}
            component={() => <ImportIcon />}
            onClick={importAIHints}
          />
        </Tooltip>
        <Tooltip placement="bottom" title="Export AI Hints">
          <Icon
            className={classNames(iconClasses, 'w-4')}
            component={() => <ExportIcon />}
            onClick={exportAIHints}
          />
        </Tooltip>
      </PanelToolbar>
      <AIHints />
    </PanelWrapper>
  );
}
