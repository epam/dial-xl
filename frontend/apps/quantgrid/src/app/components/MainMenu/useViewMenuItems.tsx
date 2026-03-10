import { useMemo } from 'react';

import Icon from '@ant-design/icons';
import {
  AdjustmentsIcon,
  ColumnsIcon,
  DialChatLogoIconColored,
  ExclamationCircleIcon,
  getDropdownDivider,
  getDropdownItem,
  HistoryIcon,
  ListTreeIcon,
  MenuItem,
  Shortcut,
  shortcutApi,
  TagIcon,
  TypographyIcon,
  TypographyOffIcon,
  ViewIcon,
  ViewportNarrowIcon,
} from '@frontend/common/lib';

import { viewMenuKeys } from './constants';

export const useViewMenuItems = ({
  collapsedPanelsTextHidden,
  panelsSplitEnabled,
  isOpen,
}: {
  collapsedPanelsTextHidden: boolean;
  panelsSplitEnabled: boolean;
  isOpen: boolean;
}): MenuItem => {
  const viewMenuItem = useMemo(() => {
    const viewMenuPath = ['ViewMenu'];
    const panelsPath = [...viewMenuPath, 'Panels'];

    return {
      label: 'View',
      key: 'ViewMenu',
      icon: (
        <Icon
          className="text-text-secondary w-[18px]"
          component={() => <ViewIcon />}
        />
      ),
      children: isOpen
        ? [
            getDropdownItem({
              label: 'Panels',
              fullPath: panelsPath,
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() => <ViewIcon />}
                />
              ),
              key: 'PanelMenu',
              children: [
                getDropdownItem({
                  label: 'Toggle Project',
                  fullPath: [...panelsPath, 'ToggleProject'],
                  key: 'ToggleProject',
                  shortcut: shortcutApi.getLabel(Shortcut.ToggleProjects),
                  icon: (
                    <Icon
                      className="text-text-accent-primary w-[18px]"
                      component={() => <ListTreeIcon />}
                    />
                  ),
                }),
                getDropdownItem({
                  label: 'Toggle Code Editor',
                  fullPath: [...panelsPath, 'ToggleCodeEditor'],
                  key: 'ToggleCodeEditor',
                  shortcut: shortcutApi.getLabel(Shortcut.ToggleCodeEditor),
                  icon: (
                    <Icon
                      className="text-text-secondary w-[18px]"
                      component={() => <TagIcon />}
                    />
                  ),
                }),
                getDropdownItem({
                  label: 'Toggle Error Panel',
                  fullPath: [...panelsPath, 'ToggleErrorPanel'],
                  key: 'ToggleErrorPanel',
                  shortcut: shortcutApi.getLabel(Shortcut.ToggleErrors),
                  icon: (
                    <Icon
                      className="text-text-error w-[18px]"
                      component={() => <ExclamationCircleIcon />}
                    />
                  ),
                }),
                getDropdownItem({
                  label: 'Toggle History Panel',
                  fullPath: [...panelsPath, 'ToggleHistoryPanel'],
                  key: 'ToggleHistoryPanel',
                  shortcut: shortcutApi.getLabel(Shortcut.ToggleHistory),
                  icon: (
                    <Icon
                      className="text-text-secondary w-[18px]"
                      component={() => <HistoryIcon />}
                    />
                  ),
                }),
                getDropdownItem({
                  label: 'Toggle Chat',
                  fullPath: [...panelsPath, 'ToggleChat'],
                  key: 'ToggleChat',
                  shortcut: shortcutApi.getLabel(Shortcut.ToggleChat),
                  icon: (
                    <Icon
                      className="text-text-secondary w-[18px]"
                      component={() => <DialChatLogoIconColored />}
                    />
                  ),
                }),
                getDropdownItem({
                  label: 'Toggle details',
                  fullPath: [...panelsPath, 'ToggleChartPanel'],
                  key: 'ToggleChartPanel',
                  shortcut: shortcutApi.getLabel(Shortcut.ToggleChart),
                  icon: (
                    <Icon
                      className="text-text-secondary w-[18px]"
                      component={() => <AdjustmentsIcon />}
                    />
                  ),
                }),
              ],
            }),
            getDropdownItem({
              label: collapsedPanelsTextHidden ? 'Show labels' : 'Hide labels',
              fullPath: [...viewMenuPath, 'TogglePanelLabels'],
              key: viewMenuKeys.togglePanelLabels,
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() =>
                    collapsedPanelsTextHidden ? (
                      <TypographyIcon />
                    ) : (
                      <TypographyOffIcon />
                    )
                  }
                />
              ),
            }),
            getDropdownItem({
              label: panelsSplitEnabled ? 'Merge panels' : 'Split panels',
              fullPath: [...viewMenuPath, 'ToggleSplitPanels'],
              key: viewMenuKeys.toggleSplitPanels,
              icon: (
                <Icon
                  className="text-text-secondary w-[18px] rotate-90"
                  component={() => <ColumnsIcon />}
                />
              ),
            }),
            getDropdownDivider(),
            getDropdownItem({
              label: 'Reset spreadsheet columns',
              fullPath: [...viewMenuPath, 'ResetSheetColumns'],
              key: viewMenuKeys.resetSheetColumns,
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() => (
                    <ViewportNarrowIcon secondaryAccentCssVar="text-accent-primary" />
                  )}
                />
              ),
            }),
            getDropdownItem({
              label: 'Toggle Chat Placement',
              fullPath: [...viewMenuPath, 'ToggleChatPlacement'],
              key: 'ToggleChatPlacement',
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() => <DialChatLogoIconColored />}
                />
              ),
            }),
          ]
        : [],
    };
  }, [isOpen, collapsedPanelsTextHidden, panelsSplitEnabled]);

  return viewMenuItem;
};
