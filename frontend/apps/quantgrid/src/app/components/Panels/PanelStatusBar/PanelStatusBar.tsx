import { Dropdown, Tooltip } from 'antd';
import cx from 'classnames';
import { ForwardedRef, forwardRef, useCallback, useContext } from 'react';

import Icon from '@ant-design/icons';

import {
  MinimizedPanelProps,
  PanelName,
  PanelPosition,
  PanelTitle,
} from '../../../common';
import { LayoutContext } from '../../../context';
import { usePanelSettings, usePanelStatusBar } from '../../../hooks';

type Props = {
  panels?: MinimizedPanelProps[];
  position?: PanelPosition;
  collapsedPanelsTextHidden: boolean;
};

export const PanelStatusBar = forwardRef(function PanelStatusBar(
  { panels, position = PanelPosition.Left, collapsedPanelsTextHidden }: Props,
  ref: ForwardedRef<HTMLDivElement>
) {
  const { togglePanel, openedPanels } = useContext(LayoutContext);
  const { showErrorNotification } = usePanelStatusBar();
  const { getPanelSettingsItems } = usePanelSettings();

  const isPanelOpen = useCallback(
    (panelName: PanelName) => {
      return openedPanels[panelName] && openedPanels[panelName].isActive;
    },
    [openedPanels]
  );

  const isBottomPanel = position === PanelPosition.Bottom;
  const isRightPanel = position === PanelPosition.Right;
  const isLeftPanel = position === PanelPosition.Left;

  return (
    <div
      className={cx(
        'bg-bgLayer2 text-[11px] tracking-normal overflow-hidden w-full h-full border-strokeTertiary',
        isBottomPanel ? 'border-t' : isLeftPanel ? 'border-r' : 'border-l'
      )}
      ref={ref}
    >
      <ul
        className={cx(
          'flex m-0 gap-1.5 px-1.5',
          !isBottomPanel
            ? 'flex-col justify-center py-1.5'
            : 'items-center pt-0.5'
        )}
      >
        {panels?.map((p) => (
          <Dropdown
            className="cursor-pointer"
            key={p.name}
            menu={{
              items: getPanelSettingsItems(
                p.name,
                PanelTitle[p.name],
                position,
                true
              ),
            }}
            trigger={['contextMenu']}
          >
            <Tooltip
              placement={isLeftPanel ? 'right' : isRightPanel ? 'left' : 'top'}
              title={p.title}
            >
              <div
                className={cx(
                  'flex gap-1 items-center justify-center h-full text-nowrap cursor-pointer select-none hover:bg-bgAccentPrimaryAlpha hover:text-textAccentPrimary rounded',
                  {
                    'text-textAccentPrimary': isPanelOpen(p.name),
                    'text-textSecondary': !isPanelOpen(p.name),
                    'flex-col py-1.5 px-[1px]':
                      !isBottomPanel && !collapsedPanelsTextHidden,
                    'flex-col p-1.5':
                      !isBottomPanel && collapsedPanelsTextHidden,
                    'px-2.5': isBottomPanel,
                  }
                )}
                data-panel={p.name}
                data-qa="collapsed-panel-button"
                key={p.name}
                onClick={() => togglePanel(p.name)}
              >
                <div
                  className={cx(
                    'relative',
                    isBottomPanel
                      ? 'size-3.5'
                      : collapsedPanelsTextHidden
                      ? 'size-6'
                      : 'size-[18px]'
                  )}
                >
                  <Icon
                    className={cx(
                      isBottomPanel
                        ? 'size-3.5'
                        : collapsedPanelsTextHidden
                        ? 'size-6'
                        : 'size-[18px]'
                    )}
                    component={() => p.icon}
                  />
                  {!isBottomPanel && showErrorNotification(p.name) && (
                    <div className="absolute top-0 -right-1 bg-strokeError w-[6px] h-[6px] ml-2 rounded-full" />
                  )}
                </div>
                {(!collapsedPanelsTextHidden || isBottomPanel) && (
                  <>
                    <span className="break-all text-wrap font-semibold">
                      {p.title}
                    </span>
                    {isBottomPanel && showErrorNotification(p.name) && (
                      <div className="bg-strokeError w-[6px] h-[6px] ml-2 rounded-full" />
                    )}
                  </>
                )}
              </div>
            </Tooltip>
          </Dropdown>
        ))}
      </ul>
    </div>
  );
});
