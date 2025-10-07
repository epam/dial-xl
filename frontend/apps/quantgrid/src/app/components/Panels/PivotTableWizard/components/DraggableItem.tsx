import { Dropdown, MenuProps } from 'antd';
import classNames from 'classnames';
import { useCallback } from 'react';

import Icon from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { DotsIcon, DragCardIcon, getDropdownItem } from '@frontend/common';

import { ContainerId, FieldItem, OnMoveItem } from '../utils';

interface Props {
  item: FieldItem;
  containerId: ContainerId;
  onMoveItem: OnMoveItem;
}

export const DraggableItem = ({ item, containerId, onMoveItem }: Props) => {
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

  const getMenuItems = useCallback((): MenuProps['items'] => {
    const items: MenuProps['items'] = [];

    if (containerId === 'available-fields') {
      // Add options to move field to specific areas
      items.push(
        getDropdownItem({
          key: 'move-to-rows',
          label: 'Move to Rows',
          onClick: () => onMoveItem(item.id, containerId, 'row-fields'),
        }),
        getDropdownItem({
          key: 'move-to-columns',
          label: 'Move to Columns',
          onClick: () => onMoveItem(item.id, containerId, 'column-fields'),
        }),
        getDropdownItem({
          key: 'move-to-values',
          label: 'Move to Values',
          onClick: () => onMoveItem(item.id, containerId, 'value-fields'),
        })
      );
    } else if (
      ['row-fields', 'column-fields', 'value-fields'].includes(containerId)
    ) {
      // Return to available fields
      items.push(
        getDropdownItem({
          key: 'remove-field',
          label: 'Remove',
          onClick: () => onMoveItem(item.id, containerId, 'available-fields'),
        })
      );

      // Move to other areas
      if (containerId !== 'row-fields') {
        items.push(
          getDropdownItem({
            key: 'move-to-rows',
            label: 'Move to Rows',
            onClick: () => onMoveItem(item.id, containerId, 'row-fields'),
          })
        );
      }

      if (containerId !== 'column-fields') {
        items.push(
          getDropdownItem({
            key: 'move-to-columns',
            label: 'Move to Columns',
            onClick: () => onMoveItem(item.id, containerId, 'column-fields'),
          })
        );
      }

      if (containerId !== 'value-fields') {
        items.push(
          getDropdownItem({
            key: 'move-to-values',
            label: 'Move to Values',
            onClick: () => onMoveItem(item.id, containerId, 'value-fields'),
          })
        );
      }
    }

    return items;
  }, [item.id, containerId, onMoveItem]);

  return (
    <Dropdown
      menu={{ items: getMenuItems() }}
      trigger={['click', 'contextMenu']}
    >
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={classNames(
          'px-2 py-1 mb-2 rounded-[3px] text-[13px] flex items-center bg-bg-layer-4 hover:opacity-80 cursor-grab group',
          isDragging ? 'opacity-50' : 'opacity-100'
        )}
      >
        <Icon
          className="w-[18px] shrink-0 mr-1 text-text-secondary"
          component={() => <DragCardIcon />}
        />
        <span className="truncate text-[13px] font-medium min-w-0 flex-1">
          {item.name}
        </span>
        <Icon
          className="w-[18px] shrink-0 cursor-default ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
          component={() => <DotsIcon />}
        />
      </div>
    </Dropdown>
  );
};
