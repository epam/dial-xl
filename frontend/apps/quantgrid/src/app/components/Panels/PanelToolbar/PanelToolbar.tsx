import { Tooltip } from 'antd';
import { Dropdown } from 'antd';
import cx from 'classnames';
import { PropsWithChildren, ReactNode, useContext, useMemo } from 'react';
import { ReflexHandle } from 'react-reflex';

import Icon from '@ant-design/icons';
import { iconClasses, MenuIcon, MinimizePanelIcon } from '@frontend/common';

import { PanelPosition, PanelProps } from '../../../common';
import { HandleContext, LayoutContext } from '../../../context';
import { usePanelSettings } from '../../../hooks';

export function PanelToolbar({
  children,
  title,
  secondaryTitle,
  panelName,
  position,
}: PropsWithChildren<Omit<PanelProps, 'dimensions'>>) {
  const { togglePanel } = useContext(LayoutContext);

  const { getPanelSettingsItems } = usePanelSettings();

  const rotateIcon = useMemo(
    () =>
      position === PanelPosition.Right
        ? 'rotate-180'
        : position === PanelPosition.Left
        ? ''
        : '-rotate-90',
    [position]
  );

  return (
    <div className="flex items-center h-5 w-full bg-bgLayer2 border-b border-b-strokeTertiary">
      <WrapHandle>
        <div className="flex flex-1 items-center h-5 min-w-0 ml-2 text-textSecondary select-none">
          <span className="text-[10px] text-textSecondary tracking-[0.6px] font-bold uppercase">
            {title}
          </span>
          {secondaryTitle && (
            <span className="h-full mx-2 text-[13px] text-textSecondary text-ellipsis inline-block overflow-hidden whitespace-nowrap">
              {secondaryTitle}
            </span>
          )}
        </div>
        <div className="h-full flex items-center mr-3">
          {children}
          {children && <div className="w-px h-full bg-strokeTertiary mx-2" />}
          <Dropdown
            className="cursor-pointer"
            menu={{ items: getPanelSettingsItems(panelName) }}
          >
            <Icon className={iconClasses} component={() => <MenuIcon />} />
          </Dropdown>
          <Tooltip placement="bottom" title="Collapse panel">
            <Icon
              className={cx('h-[16px] w-[16px] ml-2', iconClasses, rotateIcon)}
              component={() => <MinimizePanelIcon />}
              onClick={() => togglePanel(panelName)}
            />
          </Tooltip>
        </div>
      </WrapHandle>
    </div>
  );
}

function WrapHandle({ children }: { children: ReactNode }) {
  const { hasSplitter, events, index } = useContext(HandleContext);

  return hasSplitter && events && index ? (
    <ReflexHandle
      className="flex flex-1 h-5 items-center"
      events={events}
      index={index}
    >
      {children}
    </ReflexHandle>
  ) : (
    children
  );
}
