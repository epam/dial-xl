import type { MenuProps } from 'antd';
import { useCallback, useContext } from 'react';

import Icon from '@ant-design/icons';
import {
  BottomPositionIcon,
  ColumnsIcon,
  getDropdownDivider,
  getDropdownItem,
  LeftPositionIcon,
  MinimizePanelIcon,
  RightPositionIcon,
  TypographyIcon,
  TypographyOffIcon,
} from '@frontend/common';

import { PanelName, PanelPosition } from '../common';
import { LayoutContext } from '../context';

export function usePanelSettings() {
  const {
    changePanelPosition,
    togglePanel,
    openedPanels,
    collapsedPanelsTextHidden,
    panelsSplitEnabled,
    updateSplitPanelsEnabled,
    updateCollapsedPanelsTextHidden,
  } = useContext(LayoutContext);

  const getPanelSettingsItems = useCallback(
    (
      panelName: PanelName,
      panelsPosition: PanelPosition,
      isPanelCollapsed = false
    ): MenuProps['items'] => {
      const positionItems: MenuProps['items'] = [
        getDropdownItem({
          key: 'left',
          icon: (
            <Icon
              className="text-textSecondary w-[18px]"
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
              className="text-textSecondary w-[18px]"
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
              className="text-textSecondary w-[18px]"
              component={() => <BottomPositionIcon />}
            />
          ),
          label: <span>Bottom</span>,
          onClick: () => {
            changePanelPosition(panelName, PanelPosition.Bottom);
          },
        }),
      ];

      const generalPanelsSettingsItems: MenuProps['items'] = [
        getDropdownDivider(),
        getDropdownItem({
          key: 'hideText',
          icon: (
            <Icon
              className="text-textSecondary w-[18px]"
              component={() =>
                collapsedPanelsTextHidden ? (
                  <TypographyIcon />
                ) : (
                  <TypographyOffIcon />
                )
              }
            />
          ),
          label: (
            <span>
              {collapsedPanelsTextHidden ? 'Show labels' : 'Hide labels'}
            </span>
          ),
          onClick: () => {
            updateCollapsedPanelsTextHidden(!collapsedPanelsTextHidden);
          },
        }),
        getDropdownItem({
          key: 'split',
          icon: (
            <Icon
              className="text-textSecondary rotate-90 w-[18px]"
              component={() => <ColumnsIcon />}
            />
          ),
          label: (
            <span>{panelsSplitEnabled ? 'Merge panels' : 'Split panels'}</span>
          ),
          onClick: () => {
            updateSplitPanelsEnabled(!panelsSplitEnabled);
          },
        }),
      ];

      const isPanelOpened =
        openedPanels[panelName] && openedPanels[panelName].isActive;
      let iconRotate = '';

      if (panelsPosition === PanelPosition.Left) {
        iconRotate = isPanelOpened ? '' : 'rotate-180';
      } else if (panelsPosition === PanelPosition.Right) {
        iconRotate = isPanelOpened ? 'rotate-180' : '';
      } else {
        iconRotate = isPanelOpened ? '-rotate-90' : 'rotate-90';
      }

      const expandItem: MenuProps['items'] = isPanelCollapsed
        ? [
            getDropdownItem({
              key: 'expand',
              icon: (
                <Icon
                  className={`h-[16px] w-[16px] text-textSecondary ${iconRotate}`}
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

      return [...expandItem, ...positionItems, ...generalPanelsSettingsItems];
    },
    [
      collapsedPanelsTextHidden,
      panelsSplitEnabled,
      openedPanels,
      changePanelPosition,
      updateCollapsedPanelsTextHidden,
      updateSplitPanelsEnabled,
      togglePanel,
    ]
  );

  return {
    getPanelSettingsItems,
  };
}
