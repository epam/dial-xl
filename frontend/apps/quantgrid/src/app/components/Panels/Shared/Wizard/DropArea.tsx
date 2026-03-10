import { MenuProps } from 'antd';
import classNames from 'classnames';
import { ReactNode } from 'react';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { FieldItem, OnMoveItem } from './constants';
import { DraggableAreaContainer } from './DraggableAreaContainer';
import { DraggableItem } from './DraggableItem';

interface Props<TContainerId extends string = string> {
  className?: string;
  emptyItemsMessage?: string;
  errorMessage?: string;
  icon: ReactNode;
  id: TContainerId;
  items: FieldItem[];
  onMoveItem: OnMoveItem;
  title: string;
  getMenuItems: (
    itemId: string,
    containerId: TContainerId,
    onMoveItem: OnMoveItem,
  ) => MenuProps['items'];
}

export const DropArea = <TContainerId extends string = string>({
  className,
  emptyItemsMessage,
  errorMessage,
  icon,
  id,
  items,
  onMoveItem,
  title,
  getMenuItems,
}: Props<TContainerId>) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <DraggableAreaContainer
      className={className}
      errorMessage={errorMessage}
      icon={icon}
      title={title}
    >
      <div className="relative flex-1 h-full overflow-hidden">
        <div
          className={classNames(
            'flex-1 p-1 overflow-y-auto thin-scrollbar transition-colors duration-200 h-full border-2',
            {
              'border-dashed border-stroke-accent-primary': isOver,
              'border-transparent': !isOver,
            },
          )}
          ref={setNodeRef}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((item) => (
              <DraggableItem
                containerId={id}
                getMenuItems={getMenuItems}
                item={item}
                key={item.id}
                onMoveItem={onMoveItem}
              />
            ))}
          </SortableContext>

          {items.length === 0 && emptyItemsMessage && (
            <div className="absolute inset-0 flex items-center justify-center text-[13px] text-text-secondary text-center p-8">
              {emptyItemsMessage}
            </div>
          )}
        </div>
      </div>
    </DraggableAreaContainer>
  );
};
