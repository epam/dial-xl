import { Dropdown } from 'antd';
import cx from 'classnames';
import classNames from 'classnames';
import {
  ForwardedRef,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
} from 'react';

import Icon from '@ant-design/icons';
import {
  DotsIcon,
  getDropdownItem,
  MenuItem,
  TableIcon,
} from '@frontend/common';

import { MinimizedPanelProps, PanelName } from '../../../common';
import { LayoutContext } from '../../../context';
import { usePanelStatusBar } from '../../../hooks';

type Props = {
  panels?: MinimizedPanelProps[];
};

export const MobilePanelStatusBar = forwardRef(function PanelStatusBar(
  { panels }: Props,
  ref: ForwardedRef<HTMLDivElement>
) {
  const { togglePanel, openedPanels } = useContext(LayoutContext);
  const { showErrorNotification } = usePanelStatusBar();

  const activePanels = useMemo(
    () =>
      Object.entries(openedPanels)
        .filter(([, value]) => value.isActive)
        .map((item) => ({
          name: item[0],
          ...item[1],
        })),
    [openedPanels]
  );

  const isPanelOpen = useCallback(
    (panelName: PanelName) => {
      return openedPanels[panelName] && openedPanels[panelName].isActive;
    },
    [openedPanels]
  );

  const { displayedPanels, additionalPanels } = useMemo(() => {
    return {
      displayedPanels: panels?.slice(0, 4) ?? [],
      additionalPanels: panels?.slice(4) ?? [],
    };
  }, [panels]);

  const { items, isItemsSelected } = useMemo(() => {
    const items: MenuItem[] = [];
    let isItemsSelected = false;

    additionalPanels.forEach((item) => {
      const isPanelOpened = isPanelOpen(item.name);
      const mappeditem = getDropdownItem({
        label: (
          <span
            className={classNames(isPanelOpened && 'text-text-accent-primary')}
          >
            {item.title}
          </span>
        ),
        icon: (
          <Icon
            className={classNames(
              isPanelOpened ? 'text-text-accent-primary' : 'text-text-secondary'
            )}
            component={() => item.icon}
          />
        ),
        key: item.name,
        onClick: () => togglePanel(item.name),
      });

      isItemsSelected = isPanelOpened || isItemsSelected || false;
      items.push(mappeditem);
    });

    return { items, isItemsSelected };
  }, [additionalPanels, isPanelOpen, togglePanel]);

  return (
    <div
      className={
        'bg-bg-layer-2 text-[11px] tracking-normal leading-none h-12 shrink-0 w-full border-stroke-tertiary border-t'
      }
      ref={ref}
    >
      <ul className={cx('grid grid-cols-6 h-full m-0 items-center')}>
        <div
          className={cx(
            'flex flex-col h-full gap-1 px-0.5 py-1.5 items-center justify-center text-nowrap cursor-pointer select-none',
            activePanels.length === 0
              ? 'text-text-accent-primary'
              : 'text-text-secondary'
          )}
          data-panel="additional-mobile-panels"
          data-qa="collapsed-panel-button"
          onClick={() =>
            activePanels.length > 0 &&
            togglePanel(activePanels[0].name as PanelName)
          }
        >
          <div className={cx('relative size-[18px] shrink-0')}>
            <Icon
              className="size-[18px] shrink-0 rotate-90"
              component={() => <TableIcon />}
            />
          </div>

          <span className="break-all text-wrap font-semibold shrink-0">
            Sheet
          </span>
        </div>

        {displayedPanels?.map((p) => (
          <div
            className={cx(
              'flex flex-col h-full gap-1 px-0.5 py-1.5 items-center justify-center text-nowrap cursor-pointer select-none',
              {
                'text-text-accent-primary': isPanelOpen(p.name),
                'text-text-secondary': !isPanelOpen(p.name),
              }
            )}
            data-panel={p.name}
            data-qa="collapsed-panel-button"
            key={p.name}
            onClick={() => togglePanel(p.name)}
          >
            <div className={cx('relative size-[18px] shrink-0')}>
              <Icon className="size-[18px] shrink-0" component={() => p.icon} />
              {showErrorNotification(p.name) && (
                <div className="absolute top-0 -right-1 bg-stroke-error w-[6px] h-[6px] ml-2 rounded-full" />
              )}
            </div>

            <span className="break-all text-wrap font-semibold shrink-0">
              {p.title}
            </span>
          </div>
        ))}

        {additionalPanels.length > 0 && (
          <Dropdown menu={{ items: items }} trigger={['click']}>
            <div
              className={cx(
                'flex flex-col h-full gap-1 px-0.5 py-1.5 items-center justify-center text-nowrap cursor-pointer select-none',
                isItemsSelected
                  ? 'text-text-accent-primary'
                  : 'text-text-secondary'
              )}
              data-panel="additional-mobile-panels"
              data-qa="collapsed-panel-button"
            >
              <div className={cx('relative size-[18px] shrink-0')}>
                <Icon
                  className="size-[18px] shrink-0 rotate-90"
                  component={() => <DotsIcon />}
                />
              </div>

              <span className="break-all text-wrap font-semibold shrink-0">
                More
              </span>
            </div>
          </Dropdown>
        )}
      </ul>
    </div>
  );
});
