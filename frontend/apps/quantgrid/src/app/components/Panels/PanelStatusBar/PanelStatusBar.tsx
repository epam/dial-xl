import { Dropdown } from 'antd';
import cx from 'classnames';
import { ForwardedRef, forwardRef, useCallback, useContext } from 'react';

import { MinimizedPanelProps, PanelName, PanelPosition } from '../../../common';
import { LayoutContext } from '../../../context';
import { usePanelSettings, usePanelStatusBar } from '../../../hooks';

type Props = {
  panels?: MinimizedPanelProps[];
  position: PanelPosition;
};

export const PanelStatusBar = forwardRef(function PanelStatusBar(
  { panels, position }: Props,
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

  return (
    <div
      className={cx(
        'bg-bgLayer2 text-[10px] tracking-[0.6px] font-bold overflow-hidden w-full h-full',
        {
          'border-r border-r-strokeTertiary': position === PanelPosition.Left,
          'border-l border-l-strokeTertiary': position === PanelPosition.Right,
        }
      )}
      ref={ref}
    >
      <ul
        className={cx('flex items-center p-0 m-0 h-5', {
          'justify-start justify pl-3': position === PanelPosition.Bottom,
          'justify-start transform rotate-90': position === PanelPosition.Right,
          'justify-end transform -rotate-90 -translate-x-100':
            position === PanelPosition.Left,
        })}
      >
        {panels?.map((p) => (
          <Dropdown
            className="cursor-pointer"
            key={p.name}
            menu={{ items: getPanelSettingsItems(p.name, true) }}
            trigger={['contextMenu']}
          >
            <div
              className={cx(
                'flex items-center justify-center h-full border-l border-l-strokeTertiary px-3 cursor-pointer select-none hover:bg-bgLayer4 hover:text-textPrimary',
                {
                  'text-textSecondary': !isPanelOpen(p.name),
                  'text-textPrimary border-b border-b-textSecondary':
                    isPanelOpen(p.name),
                }
              )}
              key={p.name}
              onClick={() => togglePanel(p.name)}
            >
              <div className="uppercase">{p.title}</div>
              {showErrorNotification(p.name) && (
                <div className="bg-strokeError w-[6px] h-[6px] ml-2 rounded-full" />
              )}
            </div>
          </Dropdown>
        ))}
      </ul>
    </div>
  );
});
