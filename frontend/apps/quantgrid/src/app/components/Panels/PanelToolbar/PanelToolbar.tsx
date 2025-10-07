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
  ArrowAltIcon,
  ArrowNarrowUp,
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
  const { togglePanel, toggleExpandPanel, expandedPanelSide } =
    useContext(LayoutContext);
  const [isCollapseTooltipOpen, setIsCollapseTooltipOpen] = useState(false);
  const [isExpandTooltipOpen, setIsExpandTooltipOpen] = useState(false);

  const expanded = expandedPanelSide === position;

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
    <div className="flex items-center h-8 md:h-7 w-full bg-bg-layer-2 border-b border-b-stroke-tertiary">
      <WrapHandle>
        <div className="flex flex-1 items-center h-7 min-w-0 mx-2 text-text-secondary select-none">
          <span className="truncate text-xs md:text-[10px] leading-none text-text-secondary tracking-[0.6px] font-bold uppercase">
            {title}
          </span>
          {secondaryTitle && (
            <span className="mx-2 text-[13px] text-text-secondary text-ellipsis inline-block overflow-hidden whitespace-nowrap">
              {secondaryTitle}
            </span>
          )}
        </div>

        <div className="flex md:hidden h-full mr-3">{children}</div>

        <div className="hidden h-full md:flex items-center mr-3">
          {children}
          {children && <div className="w-px h-5 bg-stroke-tertiary mx-2" />}
          <Tooltip
            open={isExpandTooltipOpen}
            placement="bottom"
            title={expanded ? `Collapse panel` : `Expand panel`}
            destroyOnHidden
            onOpenChange={setIsExpandTooltipOpen}
          >
            <Icon
              className={cx(
                'w-4',
                iconClasses,
                expanded ? 'rotate-[-135deg]' : 'rotate-45'
              )}
              component={() =>
                expanded ? <ArrowNarrowUp /> : <ArrowAltIcon />
              }
              onClick={() => {
                setIsExpandTooltipOpen(false);
                toggleExpandPanel(panelName);
              }}
            />
          </Tooltip>
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
              className={classNames(iconClasses, 'w-4 ml-2')}
              component={() => <SettingsIcon />}
            />
          </Dropdown>
          <Tooltip
            open={isCollapseTooltipOpen}
            placement="bottom"
            title="Minimize panel"
            destroyOnHidden
            onOpenChange={setIsCollapseTooltipOpen}
          >
            <Icon
              className={cx('w-4 ml-2', iconClasses, rotateIcon)}
              component={() => <CloseIcon />}
              data-qa="panel-hide-button"
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
