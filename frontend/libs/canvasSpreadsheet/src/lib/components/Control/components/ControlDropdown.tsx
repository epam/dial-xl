import cx from 'classnames';
import { useCallback, useMemo, useState } from 'react';

import { ControlData } from '@frontend/common';

import { GridCell } from '../../../types';
import { GridEventBus } from '../../../utils';
import {
  useInfiniteScrollEmit,
  useSearch,
  useSyncSingleSelection,
} from '../hooks';
import {
  buildItems,
  controlListItemHeight,
  controlListMaxHeight,
  normalizeControlValue,
} from '../utils';
import { ControlShell } from './ControlShell';
import { VirtualizedList } from './VirtualList';

type Props = {
  controlData: ControlData | null;
  controlIsLoading: boolean;
  cell: GridCell | null;
  eventBus: GridEventBus;
  onClose?: () => void;
};

export function ControlDropdown({
  controlData,
  controlIsLoading,
  cell,
  eventBus,
  onClose,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const items = useMemo(() => buildItems(controlData), [controlData]);

  const {
    searchValue,
    setSearchValue,
    resetScrollSignal,
    clearResetScrollSignal,
  } = useSearch(eventBus, cell);
  const onScroll = useInfiniteScrollEmit(eventBus, cell, searchValue);

  useSyncSingleSelection(controlData, setSelected);

  const onApply = useCallback(
    (reset: boolean) => {
      if (!cell?.table || !cell?.field) return;
      const values = reset || !selected ? [] : [selected];
      eventBus.emit({
        type: 'control/apply',
        payload: {
          tableName: cell.table.tableName,
          fieldName: cell.field.fieldName,
          values,
        },
      });
      setSearchValue('');
      onClose?.();
    },
    [selected, cell, eventBus, onClose, setSearchValue]
  );

  return (
    <ControlShell
      isEmpty={items.length === 0}
      isLoading={controlIsLoading}
      searchValue={searchValue}
      onApply={onApply}
      onSearchChange={setSearchValue}
    >
      <VirtualizedList
        clearResetScrollSignal={clearResetScrollSignal}
        data={items}
        height={controlListMaxHeight}
        itemHeight={controlListItemHeight}
        itemKey={(i) => i.value}
        renderItem={(item) => {
          const isActive =
            selected &&
            normalizeControlValue(selected) ===
              normalizeControlValue(item.value);

          return (
            <div
              className={cx(
                'px-2 py-1 cursor-pointer select-none text-[13px] rounded-[3px] hover:bg-bg-layer-4',
                item.isUnavailable
                  ? 'text-text-secondary'
                  : 'text-text-primary',
                isActive &&
                  'bg-bg-accent-primary-alpha hover:!bg-bg-accent-primary-alpha-2'
              )}
              key={item.value}
              onClick={() => setSelected(item.value)}
            >
              {item.displayValue}
            </div>
          );
        }}
        resetScrollSignal={resetScrollSignal}
        onEndReached={onScroll}
      />
    </ControlShell>
  );
}
