import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { ColumnsIcon, FieldIcon, RowsIcon, TotalIcon } from '@frontend/common';

import { useDragAndDrop } from '../hooks';
import { PivotWizardContext } from '../PivotWizardContext';
import {
  ContainerId,
  isFieldContainer,
  SetFieldsCallback,
  toSelectOption,
} from '../utils';
import { AggregationSelector } from './AggregationSelector';
import { DraggingItem } from './DraggingItem';
import { DropArea } from './DropArea';

export function StructureSection() {
  const {
    aggregationArgsCount,
    aggregationFunctions,
    availableFields,
    columnFields,
    getItemById,
    onChangeAggregation,
    rowFields,
    selectedAggregation,
    setAvailableFields,
    setColumnFields,
    setRowFields,
    setValueFields,
    valueFields,
  } = useContext(PivotWizardContext);

  const [valuesErrorMessage, setValuesErrorMessage] = useState('');

  const { activeField, findItemContainerId, handleDragStart, handleDragEnd } =
    useDragAndDrop();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const aggregationOptions = useMemo(() => {
    return aggregationFunctions.map((fn) => toSelectOption(fn));
  }, [aggregationFunctions]);

  const handleMoveItem = useCallback(
    (
      itemId: string,
      sourceContainer: ContainerId,
      targetContainer: ContainerId
    ) => {
      const item = getItemById(itemId);
      if (!item) return;

      const containerStateMap = {
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

      // Moving between field containers
      if (
        isFieldContainer(sourceContainer) &&
        isFieldContainer(targetContainer)
      ) {
        // Remove from the source container
        containerStateMap[sourceContainer].setter((prev) =>
          prev.filter((f) => f.id !== itemId)
        );

        // Add to the target container
        containerStateMap[targetContainer].setter((prev) => [...prev, item]);
      }
    },
    [
      getItemById,
      availableFields,
      setAvailableFields,
      rowFields,
      setRowFields,
      columnFields,
      setColumnFields,
      valueFields,
      setValueFields,
    ]
  );

  const valuesTitle = useMemo(() => {
    return `Values (${valueFields.length}/${aggregationArgsCount})`;
  }, [aggregationArgsCount, valueFields]);

  useEffect(() => {
    if (valueFields.length > 0 && aggregationArgsCount > 0) {
      const errorMessage =
        valueFields.length > aggregationArgsCount
          ? `You can only select up to ${aggregationArgsCount} field${
              aggregationArgsCount > 1 ? 's' : ''
            } for values.`
          : '';
      setValuesErrorMessage(errorMessage);
    } else {
      setValuesErrorMessage('');
    }
  }, [valueFields, aggregationArgsCount]);

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
      >
        <div className="flex w-full h-[500px] max-h-[500px]">
          <div className="w-1/2 flex flex-col h-full">
            <DropArea
              className="h-full flex-grow"
              emptyItemsMessage="No columns available"
              icon={<FieldIcon />}
              id="available-fields"
              items={availableFields}
              title="Available Columns"
              onMoveItem={handleMoveItem}
            />
          </div>

          <div className="h-full w-1/2 flex flex-col pl-4">
            <div className="flex flex-col space-y-2 h-full">
              <DropArea
                className="h-[calc(33.33%)] max-h-[33%]"
                emptyItemsMessage="Drag columns here"
                icon={<RowsIcon />}
                id="row-fields"
                items={rowFields}
                title="Rows"
                onMoveItem={handleMoveItem}
              />
              <DropArea
                className="h-[calc(33.33%)] max-h-[33%]"
                emptyItemsMessage="Drag columns here"
                icon={<ColumnsIcon />}
                id="column-fields"
                items={columnFields}
                title="Columns"
                onMoveItem={handleMoveItem}
              />
              <DropArea
                className="h-[calc(33.33%)] max-h-[33%]"
                emptyItemsMessage="Drag columns here"
                errorMessage={valuesErrorMessage}
                icon={<TotalIcon />}
                id="value-fields"
                items={valueFields}
                title={valuesTitle}
                onMoveItem={handleMoveItem}
              />
            </div>
          </div>

          <DragOverlay>
            {activeField && findItemContainerId(activeField.id) ? (
              <DraggingItem item={activeField} />
            ) : null}
          </DragOverlay>
        </div>
      </DndContext>

      <AggregationSelector
        aggregationOptions={aggregationOptions}
        selectedAggregation={selectedAggregation}
        onAggregationChange={onChangeAggregation}
      />
    </>
  );
}
