import classNames from 'classnames';
import { ReactNode } from 'react';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { ContainerId, FieldItem, OnMoveItem } from '../utils';
import { DraggableAreaContainer } from './DraggableAreaContainer';
import { DraggableItem } from './DraggableItem';

interface Props {
  className?: string;
  emptyItemsMessage?: string;
  errorMessage?: string;
  icon: ReactNode;
  id: ContainerId;
  items: FieldItem[];
  onMoveItem: OnMoveItem;
  title: string;
}

export const DropArea = ({
  className,
  emptyItemsMessage,
  errorMessage,
  icon,
  id,
  items,
  onMoveItem,
  title,
}: Props) => {
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
            'flex-1 p-2 overflow-y-auto thin-scrollbar transition-colors duration-200 h-full',
            isOver && 'border-2 border-dashed border-strokeAccentPrimary'
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
                item={item}
                key={item.id}
                onMoveItem={onMoveItem}
              />
            ))}
          </SortableContext>

          {items.length === 0 && emptyItemsMessage && (
            <div className="absolute inset-0 flex items-center justify-center text-[13px] text-textSecondary text-center p-8">
              {emptyItemsMessage}
            </div>
          )}
        </div>
      </div>
    </DraggableAreaContainer>
  );
};
