import { useCallback, useContext, useState } from 'react';

import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

import { PivotWizardContext } from '../PivotWizardContext';
import {
  ContainerId,
  FieldContainerId,
  fieldContainers,
  FieldItem,
  SetFieldsCallback,
} from '../utils';

export function useDragAndDrop() {
  const {
    getItemById,
    setAvailableFields,
    setRowFields,
    setColumnFields,
    setValueFields,
    availableFields,
    rowFields,
    columnFields,
    valueFields,
  } = useContext(PivotWizardContext);

  const [activeField, setActiveField] = useState<FieldItem | null>(null);

  const findItemContainerId = useCallback(
    (id: string): FieldContainerId | null => {
      const containerMapping: Record<FieldContainerId, FieldItem[]> = {
        'available-fields': availableFields,
        'row-fields': rowFields,
        'column-fields': columnFields,
        'value-fields': valueFields,
      };

      const foundEntry = Object.entries(containerMapping).find(([_, items]) =>
        items.some((item) => item.id === id)
      );

      return foundEntry ? (foundEntry[0] as FieldContainerId) : null;
    },
    [availableFields, rowFields, columnFields, valueFields]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const item = getItemById(active.id as string);
      setActiveField(item);
    },
    [getItemById]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveField(null);
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as ContainerId;
      const containerMapping = {
        'available-fields': {
          items: availableFields,
          setter: setAvailableFields as SetFieldsCallback,
        },
        'row-fields': {
          items: rowFields,
          setter: setRowFields as SetFieldsCallback,
        },
        'column-fields': {
          items: columnFields,
          setter: setColumnFields as SetFieldsCallback,
        },
        'value-fields': {
          items: valueFields,
          setter: setValueFields as SetFieldsCallback,
        },
      };

      const validContainers = fieldContainers;
      const findContainerId = findItemContainerId;

      const sourceContainerId = findContainerId(activeId);
      if (!sourceContainerId) return;

      const draggedItem = getItemById(activeId);
      if (!draggedItem) return;

      let destContainerId: FieldContainerId | null;

      // If dropping directly on a container
      if (validContainers.includes(overId)) {
        destContainerId = overId as FieldContainerId;
      } else {
        // If dropping on an item, find its container
        const containerOfItem = findContainerId(overId as string);
        if (!containerOfItem) return;
        destContainerId = containerOfItem;
      }

      // Helper for finding item index in a collection
      const getIndex = (id: string, items: FieldItem[]) =>
        items.findIndex((item) => item.id === id);

      // Sorting within the same container
      if (sourceContainerId === destContainerId) {
        // If dropping directly on a container, don't need to sort
        if (validContainers.includes(overId)) return;

        // Handle sorting
        if (containerMapping[sourceContainerId]) {
          containerMapping[sourceContainerId].setter((items) => {
            const oldIndex = getIndex(activeId, items);
            const newIndex = getIndex(overId as string, items);

            return arrayMove(items, oldIndex, newIndex);
          });
        }

        return;
      }

      // Move between containers. Remove from source
      if (containerMapping[sourceContainerId]) {
        containerMapping[sourceContainerId].setter((prev) =>
          prev.filter((item) => item.id !== activeId)
        );
      }

      // Add to destination
      if (containerMapping[destContainerId]) {
        containerMapping[destContainerId].setter((prev) => [
          ...prev,
          draggedItem,
        ]);
      }
    },
    [
      findItemContainerId,
      getItemById,
      availableFields,
      rowFields,
      columnFields,
      valueFields,
      setAvailableFields,
      setRowFields,
      setColumnFields,
      setValueFields,
    ]
  );

  return {
    activeField,
    findItemContainerId,
    handleDragStart,
    handleDragEnd,
  };
}
