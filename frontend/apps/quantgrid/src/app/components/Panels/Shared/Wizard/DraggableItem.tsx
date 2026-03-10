import { Dropdown, MenuProps } from 'antd';
import cx from 'classnames';
import { useMemo } from 'react';

import Icon from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { DotsIcon, DragCardIcon } from '@frontend/common';

import { FieldItem, OnMoveItem } from './constants';

interface Props<TContainerId extends string = string> {
  item: FieldItem;
  containerId: TContainerId;
  onMoveItem: OnMoveItem;
  getMenuItems: (
    itemId: string,
    containerId: TContainerId,
    onMoveItem: OnMoveItem,
  ) => MenuProps['items'];
  disableUsedInAvailable?: boolean;
}

export const DraggableItem = <TContainerId extends string = string>({
  item,
  containerId,
  onMoveItem,
  getMenuItems,
  disableUsedInAvailable = false,
}: Props<TContainerId>) => {
  const isUsedInAvailable = useMemo(() => {
    const isUsed = (item as FieldItem & { isUsed?: boolean }).isUsed;

    return String(containerId) === 'available-fields' && Boolean(isUsed);
  }, [containerId, item]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: { item },
  });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
  };

  return (
    <Dropdown
      menu={{ items: getMenuItems(item.id, containerId, onMoveItem) }}
      trigger={['click', 'contextMenu']}
    >
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={cx(
          'px-2 py-1 mb-2 rounded-[3px] text-[13px] flex items-center bg-bg-layer-4 hover:opacity-80 cursor-grab group',
          isDragging
            ? 'opacity-50'
            : isUsedInAvailable && disableUsedInAvailable
              ? 'opacity-50'
              : 'opacity-100',
        )}
      >
        <Icon
          className="w-[18px] shrink-0 mr-1 text-text-secondary"
          component={() => <DragCardIcon />}
        />
        <span
          className={cx(
            'truncate text-[13px] font-medium min-w-0 flex-1',
            isUsedInAvailable &&
              disableUsedInAvailable &&
              'text-text-secondary',
          )}
        >
          {item.name}
        </span>
        <Icon
          className="w-[18px] shrink-0 cursor-pointer ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
          component={() => <DotsIcon />}
        />
      </div>
    </Dropdown>
  );
};
