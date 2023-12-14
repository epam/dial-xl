import type { MenuProps } from 'antd';
import { Dropdown } from 'antd';
import { PropsWithChildren, ReactNode, useContext, useMemo } from 'react';
import { ReflexHandle } from 'react-reflex';

import {
  MenuUnfoldOutlined,
  VerticalAlignBottomOutlined,
} from '@ant-design/icons';

import { PanelPosition, PanelProps } from '../../common';
import { HandleContext, LayoutContext } from '../../context';

export function PanelToolbar({
  children,
  title,
  panelName,
  position,
}: PropsWithChildren<PanelProps>) {
  const { togglePanel, changePanelPosition } = useContext(LayoutContext);

  const items: MenuProps['items'] = useMemo(
    () => [
      {
        key: 'left',
        label: <span>Left</span>,
        onClick: () => {
          changePanelPosition(panelName, PanelPosition.Left);
        },
      },
      {
        key: 'right',
        label: <span>Right</span>,
        onClick: () => {
          changePanelPosition(panelName, PanelPosition.Right);
        },
      },
      {
        key: 'bottom',
        label: <span>Bottom</span>,
        onClick: () => {
          changePanelPosition(panelName, PanelPosition.Bottom);
        },
      },
    ],
    [changePanelPosition, panelName]
  );

  const rotateIcon = useMemo(
    () =>
      position === PanelPosition.Right
        ? '-rotate-90'
        : position === PanelPosition.Left
        ? 'rotate-90'
        : '',
    [position]
  );

  return (
    <div className="flex items-center h-7 w-full bg-neutral-50 border-b-2 border-b-neutral-100 text-sm text-neutral-400">
      <WrapHandle>
        <div className="flex flex-1 min-w-0 ml-1.5 text-neutral-600 select-none">
          {title}
        </div>
        <div className="flex items-center mr-3">
          {children}
          <Dropdown className="cursor-pointer" menu={{ items }}>
            <MenuUnfoldOutlined />
          </Dropdown>
          <VerticalAlignBottomOutlined
            className={`ml-1.5 cursor-pointer transform ${rotateIcon}`}
            onClick={() => togglePanel(panelName)}
          />
        </div>
      </WrapHandle>
    </div>
  );
}

function WrapHandle({ children }: { children: ReactNode }) {
  const { hasSplitter, events, index } = useContext(HandleContext);

  return hasSplitter && events && index ? (
    <ReflexHandle className="flex flex-1" events={events} index={index}>
      {children}
    </ReflexHandle>
  ) : (
    children
  );
}
