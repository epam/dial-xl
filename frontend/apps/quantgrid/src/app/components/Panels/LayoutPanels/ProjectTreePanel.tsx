import { Tooltip } from 'antd';
import classNames from 'classnames';

import Icon from '@ant-design/icons';
import { iconClasses, NewProjectIcon } from '@frontend/common';

import { PanelProps } from '../../../common';
import { useProjectActions } from '../../../hooks';
import { PanelToolbar } from '../PanelToolbar';
import { ProjectTree } from '../ProjectTree';
import { PanelWrapper } from './PanelWrapper';

export function ProjectTreePanel({
  panelName,
  title,
  position,
  isActive,
}: PanelProps) {
  const projectAction = useProjectActions();

  return (
    <PanelWrapper isActive={isActive} panelName={panelName}>
      <PanelToolbar panelName={panelName} position={position} title={title}>
        <Tooltip placement="bottom" title="Create worksheet">
          <Icon
            className={classNames(iconClasses, 'w-[16px]')}
            component={() => <NewProjectIcon />}
            onClick={projectAction.createWorksheetAction}
          />
        </Tooltip>
      </PanelToolbar>
      <ProjectTree />
    </PanelWrapper>
  );
}
