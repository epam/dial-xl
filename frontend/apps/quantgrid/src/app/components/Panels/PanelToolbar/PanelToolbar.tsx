import { Tooltip } from 'antd';
import { Dropdown } from 'antd';
import cx from 'classnames';
import classNames from 'classnames';
import {
  PropsWithChildren,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';
import { ReflexHandle } from 'react-reflex';

import Icon from '@ant-design/icons';
import {
  CloseIcon,
  iconClasses,
  SettingsIcon,
  useIsMobile,
} from '@frontend/common';

import { PanelPosition, PanelProps, PanelTitle } from '../../../common';
import { HandleContext, LayoutContext } from '../../../context';
import { usePanelSettings } from '../../../hooks';

export function PanelToolbar({
  children,
  title,
  secondaryTitle,
  panelName,
  position = PanelPosition.Left,
}: PropsWithChildren<Omit<PanelProps, 'dimensions' | 'isActive'>>) {
  const { togglePanel } = useContext(LayoutContext);
  const [isCollapseTooltipOpen, setIsCollapseTooltipOpen] = useState(false);

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
    <div className="flex items-center h-8 md:h-7 w-full bg-bgLayer2 border-b border-b-strokeTertiary">
      <WrapHandle>
        <div className="flex flex-1 items-center h-7 min-w-0 mx-2 text-textSecondary select-none">
          <span className="truncate text-xs md:text-[10px] leading-none text-textSecondary tracking-[0.6px] font-bold uppercase">
            {title}
          </span>
          {secondaryTitle && (
            <span className="mx-2 text-[13px] text-textSecondary text-ellipsis inline-block overflow-hidden whitespace-nowrap">
              {secondaryTitle}
            </span>
          )}
        </div>

        <div className="flex md:hidden h-full mr-3">{children}</div>

        <div className="hidden h-full md:flex items-center mr-3">
          {children}
          {children && <div className="w-px h-5 bg-strokeTertiary mx-2" />}
          <Dropdown
            className="cursor-pointer"
            menu={{
              items: getPanelSettingsItems(
                panelName,
                PanelTitle[panelName],
                position
              ),
            }}
          >
            <Icon
              className={classNames(iconClasses, 'w-4')}
              component={() => <SettingsIcon />}
            />
          </Dropdown>
          <Tooltip
            open={isCollapseTooltipOpen}
            placement="bottom"
            title="Collapse panel"
            onOpenChange={setIsCollapseTooltipOpen}
          >
            <Icon
              className={cx('w-4 ml-2', iconClasses, rotateIcon)}
              component={() => <CloseIcon />}
              onClick={() => {
                setIsCollapseTooltipOpen(false);
                togglePanel(panelName);
              }}
            />
          </Tooltip>
        </div>
      </WrapHandle>
    </div>
  );
}

function WrapHandle({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const values = useContext(HandleContext);

  return values?.hasSplitter && values?.events && values?.index && !isMobile ? (
    <ReflexHandle
      className="flex flex-1 h-7 items-center"
      events={values.events}
      index={values.index}
    >
      {children}
    </ReflexHandle>
  ) : (
    children
  );
}
