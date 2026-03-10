import { MenuProps } from 'antd';
import {
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { FieldIcon, getDropdownItem, RowsIcon } from '@frontend/common';

import { uniqueId } from '../../../../services';
import {
  ContainerId,
  DraggingItem,
  DropArea,
  FieldItem,
  findScrollParent,
  OnMoveItem,
  parseValueFnRowId,
  parseValueFnSlotId,
  ValueFunctionItem,
  ValuesFunctionsSection,
} from '../../Shared';
import { GroupByWizardContext } from '../context';
import { defaultArgCount, FieldContainerId, rowItemKey } from '../utils';
import { valueFunctionsContainerId } from '../utils';

const availableFieldsId = 'available-fields';
const rowFieldsId = 'row-fields';

export function StructureSection() {
  const {
    availableFields,
    getItemById,
    rowFields,
    setRowFields,
    triggerUserAction,
    valueFunctions,
    setValueFunctions,
    aggregationFunctionInfo,
  } = useContext(GroupByWizardContext);

  const [activeField, setActiveField] = useState<FieldItem | null>(null);

  const valuesWrapRef = useRef<HTMLDivElement | null>(null);
  const [valuesHeightPx, setValuesHeightPx] = useState<string | undefined>(
    undefined,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const usedFieldNames = useMemo(() => {
    const used = new Set<string>();
    rowFields.forEach((f) => used.add(f.name));
    valueFunctions.forEach((vf) =>
      (vf.args ?? []).forEach((a) => {
        if (a?.name) used.add(a.name);
      }),
    );

    return used;
  }, [rowFields, valueFunctions]);

  const availableFieldsWithUsage = useMemo(() => {
    return availableFields.map((f) => ({
      ...f,
      isUsed: usedFieldNames.has(f.name),
    }));
  }, [availableFields, usedFieldNames]);

  const addRowField = useCallback(
    (item: FieldItem) => {
      setRowFields((prev) => {
        const already = prev.some((x) => x.name === item.name);
        if (already) return prev;

        return [...prev, { ...item, id: `${rowItemKey}${item.name}` }];
      });
      triggerUserAction();
    },
    [setRowFields, triggerUserAction],
  );

  const removeRowField = useCallback(
    (itemId: string) => {
      setRowFields((prev) => prev.filter((x) => x.id !== itemId));
      triggerUserAction();
    },
    [setRowFields, triggerUserAction],
  );

  const addEmptyValueFn = useCallback(() => {
    setValueFunctions((prev) => [
      ...prev,
      {
        id: uniqueId(),
        functionName: undefined,
        args: Array.from({ length: defaultArgCount }, () => null),
      },
    ]);
    triggerUserAction();
  }, [setValueFunctions, triggerUserAction]);

  const addValueFnWithField = useCallback(
    (fieldName: string, beforeValueFnId?: string) => {
      const next: ValueFunctionItem = {
        id: uniqueId(),
        functionName: undefined,
        args: [{ id: fieldName, name: fieldName }],
      };

      setValueFunctions((prev) => {
        if (!beforeValueFnId) return [...prev, next];

        const idx = prev.findIndex((x) => x.id === beforeValueFnId);
        if (idx < 0) return [...prev, next];

        const copy = prev.slice();
        copy.splice(idx, 0, next);

        return copy;
      });

      triggerUserAction();
    },
    [setValueFunctions, triggerUserAction],
  );

  const removeValueFnRow = useCallback(
    (rowId: string) => {
      setValueFunctions((prev) => prev.filter((x) => x.id !== rowId));
      triggerUserAction();
    },
    [setValueFunctions, triggerUserAction],
  );

  const changeValueFnFunction = useCallback(
    (rowId: string, fnName?: string) => {
      setValueFunctions((prev) => {
        const info = fnName
          ? aggregationFunctionInfo.find((x) => x.name === fnName)
          : undefined;

        const nextArgCount = info?.argCount ?? defaultArgCount;

        return prev.map((row) => {
          if (row.id !== rowId) return row;

          const existing = row.args ?? [];
          const resized =
            existing.length >= nextArgCount
              ? existing.slice(0, nextArgCount)
              : [
                  ...existing,
                  ...Array.from(
                    { length: nextArgCount - existing.length },
                    () => null,
                  ),
                ];

          return { ...row, functionName: fnName, args: resized };
        });
      });

      triggerUserAction();
    },
    [aggregationFunctionInfo, setValueFunctions, triggerUserAction],
  );

  const changeValueFnArg = useCallback(
    (rowId: string, argIndex: number, fieldName?: string) => {
      setValueFunctions((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;

          const args = (row.args ?? []).slice();
          args[argIndex] = fieldName
            ? { id: fieldName, name: fieldName }
            : null;

          return { ...row, args };
        }),
      );

      triggerUserAction();
    },
    [setValueFunctions, triggerUserAction],
  );

  const findFieldContainerId = useCallback(
    (id: string): FieldContainerId | null => {
      if (id === availableFieldsId || id === rowFieldsId) return id;
      if (availableFields.some((x) => x.id === id)) return availableFieldsId;
      if (rowFields.some((x) => x.id === id)) return rowFieldsId;

      return null;
    },
    [availableFields, rowFields],
  );

  const getDraggedField = useCallback(
    (active: DragStartEvent['active'] | DragEndEvent['active']) => {
      const activeId = String(active.id);
      const fromContext = getItemById(activeId);
      if (fromContext) return fromContext;

      const maybeItem = (active.data?.current as any)?.item;

      function isFieldItem(x: unknown): x is FieldItem {
        return (
          typeof x === 'object' &&
          x !== null &&
          typeof (x as any).id === 'string' &&
          typeof (x as any).name === 'string'
        );
      }

      return isFieldItem(maybeItem) ? maybeItem : null;
    },
    [getItemById],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const activeId = String(event.active.id);

      // don't show field overlay when dragging value-function rows
      if (parseValueFnRowId(activeId)) {
        setActiveField(null);

        return;
      }

      const field = getDraggedField(event.active);
      setActiveField(field ? { id: field.id, name: field.name } : null);
    },
    [getDraggedField],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveField(null);
      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      // 1) sort value-function rows
      const activeRow = parseValueFnRowId(activeId);
      const overRow = parseValueFnRowId(overId);
      if (activeRow && overRow) {
        setValueFunctions((prev) => {
          const oldIndex = prev.findIndex((x) => x.id === activeRow.valueFnId);
          const newIndex = prev.findIndex((x) => x.id === overRow.valueFnId);
          if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex)
            return prev;

          return arrayMove(prev, oldIndex, newIndex);
        });
        triggerUserAction();

        return;
      }

      // 2) drop field into Values (container / row / slot)
      const draggedField = getDraggedField(active);
      if (draggedField) {
        const slot = parseValueFnSlotId(overId);
        if (slot) {
          changeValueFnArg(slot.valueFnId, slot.argIndex, draggedField.name);

          return;
        }

        const overValueFnRow = parseValueFnRowId(overId);
        if (overId === valueFunctionsContainerId || overValueFnRow) {
          addValueFnWithField(draggedField.name, overValueFnRow?.valueFnId);

          return;
        }
      }

      // 3) Available <-> Rows + sorting Rows
      const sourceContainer = findFieldContainerId(activeId);
      if (!sourceContainer) return;

      const destContainer =
        overId === availableFieldsId || overId === rowFieldsId
          ? (overId as FieldContainerId)
          : findFieldContainerId(overId);

      if (!destContainer) return;

      if (sourceContainer === destContainer) {
        // only rows are sortable
        if (sourceContainer !== rowFieldsId) return;
        if (overId === rowFieldsId) return;

        const oldIndex = rowFields.findIndex((x) => x.id === activeId);
        const newIndex = rowFields.findIndex((x) => x.id === overId);
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

        setRowFields((prev) => arrayMove(prev, oldIndex, newIndex));
        triggerUserAction();

        return;
      }

      if (
        sourceContainer === availableFieldsId &&
        destContainer === rowFieldsId
      ) {
        const item = getItemById(activeId);
        if (item) addRowField(item);

        return;
      }

      if (
        sourceContainer === rowFieldsId &&
        destContainer === availableFieldsId
      ) {
        removeRowField(activeId);
      }
    },
    [
      addRowField,
      addValueFnWithField,
      changeValueFnArg,
      findFieldContainerId,
      getDraggedField,
      getItemById,
      removeRowField,
      rowFields,
      setRowFields,
      setValueFunctions,
      triggerUserAction,
    ],
  );

  const handleMoveItem = useCallback(
    (
      itemId: string,
      sourceContainer: ContainerId,
      targetContainer: ContainerId,
    ) => {
      const item = getItemById(itemId);
      if (!item) return;

      if (
        sourceContainer === availableFieldsId &&
        targetContainer === rowFieldsId
      ) {
        addRowField(item);

        return;
      }

      if (
        sourceContainer === rowFieldsId &&
        targetContainer === availableFieldsId
      ) {
        removeRowField(itemId);
      }
    },
    [addRowField, getItemById, removeRowField],
  );

  const getMenuItems = useCallback(
    (
      itemId: string,
      containerId: ContainerId,
      onMoveItem: OnMoveItem,
    ): MenuProps['items'] => {
      const items: MenuProps['items'] = [];
      const draggableItemPath = ['GroupByTableWizard', itemId];

      const addToValuesItem = getDropdownItem({
        key: 'add-to-values',
        label: 'Add to Values',
        fullPath: [...draggableItemPath, 'AddToValues'],
        onClick: () => {
          const item = getItemById(itemId);
          if (item) addValueFnWithField(item.name);
        },
      });

      if (containerId === availableFieldsId) {
        items.push(
          getDropdownItem({
            key: 'move-to-rows',
            label: 'Move to Rows',
            fullPath: [...draggableItemPath, 'MoveToRows'],
            onClick: () => onMoveItem(itemId, containerId, rowFieldsId),
          }),
          addToValuesItem,
        );

        return items;
      }

      if (containerId === rowFieldsId) {
        items.push(
          getDropdownItem({
            key: 'remove-field',
            label: 'Remove',
            fullPath: [...draggableItemPath, 'Remove'],
            onClick: () => onMoveItem(itemId, containerId, availableFieldsId),
          }),
          addToValuesItem,
        );
      }

      return items;
    },
    [addValueFnWithField, getItemById],
  );

  useLayoutEffect(() => {
    const anchor = valuesWrapRef.current;
    if (!anchor) return;

    requestAnimationFrame(() => {
      const rect = anchor.getBoundingClientRect();
      const scrollParent = findScrollParent(anchor);

      const viewportBottom = scrollParent
        ? scrollParent.getBoundingClientRect().bottom
        : window.innerHeight;

      const bottomPadding = 12;
      const minHeight = 160;

      const next = Math.max(
        minHeight,
        Math.floor(viewportBottom - rect.top - bottomPadding),
      );

      setValuesHeightPx(`${next}px`);
    });
  }, []);

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
    >
      <div className="flex w-full h-[350px] max-h-[350px]">
        <div className="w-1/2 flex flex-col h-full">
          <DropArea
            className="h-full grow"
            emptyItemsMessage="No columns available"
            getMenuItems={getMenuItems}
            icon={<FieldIcon />}
            id={availableFieldsId}
            items={availableFieldsWithUsage}
            title="Available Columns"
            onMoveItem={handleMoveItem}
          />
        </div>

        <div className="h-full w-1/2 flex flex-col pl-4">
          <div className="flex flex-col space-y-2 h-full">
            <DropArea
              className="h-full max-h-full"
              emptyItemsMessage="Drag columns here"
              getMenuItems={getMenuItems}
              icon={<RowsIcon />}
              id={rowFieldsId}
              items={rowFields}
              title="Rows"
              onMoveItem={handleMoveItem}
            />
          </div>
        </div>

        <DragOverlay>
          {activeField ? <DraggingItem item={activeField} /> : null}
        </DragOverlay>
      </div>

      <div className="mt-4" ref={valuesWrapRef}>
        <ValuesFunctionsSection
          aggregationFunctions={aggregationFunctionInfo}
          availableFields={availableFields}
          heightPx={valuesHeightPx}
          id={valueFunctionsContainerId}
          maxRows={null}
          valueFunctions={valueFunctions}
          onAddEmpty={addEmptyValueFn}
          onChangeArg={changeValueFnArg}
          onChangeFunction={changeValueFnFunction}
          onRemoveRow={removeValueFnRow}
        />
      </div>
    </DndContext>
  );
}
