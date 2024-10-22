import type { MenuProps } from 'antd';
import { useCallback, useContext } from 'react';

import Icon from '@ant-design/icons';
import {
  BottomPositionIcon,
  getDropdownDivider,
  getDropdownItem,
  LeftPositionIcon,
  MinimizePanelIcon,
  RightPositionIcon,
} from '@frontend/common';

import { PanelName, PanelPosition } from '../common';
import { LayoutContext } from '../context';

export function usePanelSettings() {
  const { changePanelPosition, togglePanel, openedPanels } =
    useContext(LayoutContext);

  const getPanelSettingsItems = useCallback(
    (panelName: PanelName, isPanelCollapsed = false): MenuProps['items'] => {
      const positionItems: MenuProps['items'] = [
        getDropdownItem({
          key: 'left',
          icon: (
            <Icon
              className="stroke-textSecondary"
              component={() => <LeftPositionIcon />}
            />
          ),
          label: <span>Left</span>,
          onClick: () => {
            changePanelPosition(panelName, PanelPosition.Left);
          },
        }),
        getDropdownItem({
          key: 'right',
          icon: (
            <Icon
              className="stroke-textSecondary"
              component={() => <RightPositionIcon />}
            />
          ),
          label: <span>Right</span>,
          onClick: () => {
            changePanelPosition(panelName, PanelPosition.Right);
          },
        }),
        getDropdownItem({
          key: 'bottom',
          icon: (
            <Icon
              className="stroke-textSecondary"
              component={() => <BottomPositionIcon />}
            />
          ),
          label: <span>Bottom</span>,
          onClick: () => {
            changePanelPosition(panelName, PanelPosition.Bottom);
          },
        }),
      ];

      const isPanelOpened =
        openedPanels[panelName] && openedPanels[panelName].isActive;
      const iconRotate = isPanelOpened ? '' : 'rotate-180';
      const expandItem: MenuProps['items'] = isPanelCollapsed
        ? [
            getDropdownItem({
              key: 'expand',
              icon: (
                <Icon
                  className={`h-[18px] w-[18px] text-textSecondary ${iconRotate}`}
                  component={() => <MinimizePanelIcon />}
                />
              ),
              label: <span>{isPanelOpened ? 'Collapse' : 'Expand'}</span>,
              onClick: () => {
                togglePanel(panelName);
              },
            }),
            getDropdownDivider(),
          ]
        : [];

      return [...expandItem, ...positionItems];
    },
    [changePanelPosition, togglePanel, openedPanels]
  );

  return {
    getPanelSettingsItems,
  };
}
