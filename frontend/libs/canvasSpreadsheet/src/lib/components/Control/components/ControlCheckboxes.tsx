import { Checkbox } from 'antd';
import { useCallback, useMemo, useState } from 'react';

import { ControlData } from '@frontend/common';

import { GridCell } from '../../../types';
import { GridEventBus } from '../../../utils';
import {
  useInfiniteScrollEmit,
  useSearch,
  useSyncMultiSelection,
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

export function ControlCheckboxes({
  controlData,
  controlIsLoading,
  cell,
  eventBus,
  onClose,
}: Props) {
  const [checkedSet, setCheckedSet] = useState<Set<string>>(new Set());
  const items = useMemo(() => buildItems(controlData), [controlData]);

  const {
    searchValue,
    setSearchValue,
    resetScrollSignal,
    clearResetScrollSignal,
  } = useSearch(eventBus, cell);
  const onScroll = useInfiniteScrollEmit(eventBus, cell, searchValue);

  useSyncMultiSelection(controlData, setCheckedSet);

  const onApply = useCallback(
    (reset: boolean) => {
      if (!cell?.table || !cell?.field) return;
      eventBus.emit({
        type: 'control/apply',
        payload: {
          tableName: cell.table.tableName,
          fieldName: cell.field.fieldName,
          values: reset ? [] : Array.from(checkedSet),
        },
      });
      onClose?.();
    },
    [checkedSet, cell, eventBus, onClose],
  );

  const normalizedCheckedSet = useMemo(() => {
    const s = new Set<string>();
    for (const v of checkedSet) s.add(normalizeControlValue(v));

    return s;
  }, [checkedSet]);

  const toggleValue = useCallback((rawValue: string, nextChecked: boolean) => {
    const norm = normalizeControlValue(rawValue);
    setCheckedSet((prev) => {
      const next = new Set(prev);
      if (nextChecked) {
        next.add(rawValue);
      } else {
        for (const v of next) {
          if (normalizeControlValue(v) === norm) {
            next.delete(v);
            break;
          }
        }
      }

      return next;
    });
  }, []);

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
          const isChecked = normalizedCheckedSet.has(
            normalizeControlValue(item.value),
          );

          return (
            <label
              className="px-2 pb-1 text-[13px] flex items-center gap-1 cursor-pointer"
              key={item.value}
            >
              <Checkbox
                checked={isChecked}
                onChange={(e) => toggleValue(item.value, e.target.checked)}
              />
              <span
                className={
                  item.isUnavailable ? 'text-text-secondary' : undefined
                }
              >
                {item.displayValue}
              </span>
            </label>
          );
        }}
        resetScrollSignal={resetScrollSignal}
        onEndReached={onScroll}
      />
    </ControlShell>
  );
}
