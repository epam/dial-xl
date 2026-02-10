import VirtualList, { ListRef } from 'rc-virtual-list';
import { Key, ReactNode } from 'react';
import { useEffect, useRef } from 'react';

type Props<T> = {
  data: T[];
  itemHeight: number;
  height: number;
  itemKey: (item: T) => Key;
  onEndReached?: () => void;
  renderItem: (item: T) => ReactNode;
};

export function VirtualizedList<T>({
  data,
  itemHeight,
  height,
  itemKey,
  onEndReached,
  renderItem,
  resetScrollSignal,
  clearResetScrollSignal,
}: Props<T> & {
  resetScrollSignal: boolean;
  clearResetScrollSignal: () => void;
}) {
  const listRef = useRef<ListRef | null>(null);

  useEffect(() => {
    if (resetScrollSignal) {
      listRef.current?.scrollTo({ top: 0 });
      clearResetScrollSignal();
    }
  }, [resetScrollSignal, clearResetScrollSignal]);

  return (
    <VirtualList
      data={data}
      height={height}
      itemHeight={itemHeight}
      itemKey={itemKey}
      ref={listRef}
      onScroll={(e) => {
        const el = e.currentTarget;
        const atBottom =
          Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) < 1;
        if (atBottom) onEndReached?.();
      }}
    >
      {(item: T) => renderItem(item)}
    </VirtualList>
  );
}
