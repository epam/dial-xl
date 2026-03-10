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
import { PivotWizardContext } from '../context';
import {
  colItemKey,
  defaultArgCount,
  FieldContainerId,
  rowItemKey,
  valueFunctionsContainerId,
} from '../utils';

const availableFieldsId = 'available-fields';
const rowFieldsId = 'row-fields';
const columnFieldsId = 'column-fields';

export function StructureSection() {
  const {
    availableFields,
    getItemById,
    rowFields,
    columnFields,
    setRowFields,
    setColumnFields,
    triggerUserAction,
    valueFunctions,
    setValueFunctions,
    aggregationFunctionInfo,
  } = useContext(PivotWizardContext);

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
    columnFields.forEach((f) => used.add(f.name));
    valueFunctions.forEach((vf) =>
      (vf.args ?? []).forEach((a) => {
        if (a?.name) used.add(a.name);
      }),
    );

    return used;
  }, [rowFields, columnFields, valueFunctions]);

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
        const alreadyInCols = columnFields.some((x) => x.name === item.name);
        if (already || alreadyInCols) return prev;

        return [...prev, { ...item, id: `${rowItemKey}${item.name}` }];
      });
      triggerUserAction();
    },
    [setRowFields, triggerUserAction, columnFields],
  );

  const addColumnField = useCallback(
    (item: FieldItem) => {
      setColumnFields((prev) => {
        const already = prev.some((x) => x.name === item.name);
        const alreadyInRows = rowFields.some((x) => x.name === item.name);
        if (already || alreadyInRows) return prev;

        return [...prev, { ...item, id: `${colItemKey}${item.name}` }];
      });
      triggerUserAction();
    },
    [setColumnFields, triggerUserAction, rowFields],
  );

  const removeRowField = useCallback(
    (itemId: string) => {
      setRowFields((prev) => prev.filter((x) => x.id !== itemId));
      triggerUserAction();
    },
    [setRowFields, triggerUserAction],
  );

  const removeColumnField = useCallback(
    (itemId: string) => {
      setColumnFields((prev) => prev.filter((x) => x.id !== itemId));
      triggerUserAction();
    },
    [setColumnFields, triggerUserAction],
  );

  const addEmptyValueFn = useCallback(() => {
    setValueFunctions((prev) => {
      if (prev.length >= 1) return prev;

      return [
        ...prev,
        {
          id: uniqueId(),
          functionName: undefined,
          args: Array.from({ length: defaultArgCount }, () => null),
        },
      ];
    });
    triggerUserAction();
  }, [setValueFunctions, triggerUserAction]);

  const addValueFnWithField = useCallback(
    (fieldName: string) => {
      setValueFunctions((prev) => {
        if (prev.length === 0) {
          const next: ValueFunctionItem = {
            id: uniqueId(),
            functionName: undefined,
            args: [{ id: fieldName, name: fieldName }],
          };

          return [next];
        }

        const row = prev[0];
        const args = (row.args ?? []).slice();
        const emptyIdx = args.findIndex((x) => !x);
        if (emptyIdx === -1) return prev;

        args[emptyIdx] = { id: fieldName, name: fieldName };

        return [{ ...row, args }];
      });

      triggerUserAction();
    },
    [setValueFunctions, triggerUserAction],
  );

  const removeValueFnRow = useCallback(() => {
    setValueFunctions([]);
    triggerUserAction();
  }, [setValueFunctions, triggerUserAction]);

  const changeValueFnFunction = useCallback(
    (rowId: string, fnName?: string) => {
      setValueFunctions((prev) => {
        const row = prev.find((x) => x.id === rowId);
        if (!row) return prev;

        const info = fnName
          ? aggregationFunctionInfo.find((x) => x.name === fnName)
          : undefined;

        const nextArgCount = info?.argCount ?? defaultArgCount;

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

        return prev.map((r) =>
          r.id === rowId ? { ...r, functionName: fnName, args: resized } : r,
        );
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
      if (
        id === availableFieldsId ||
        id === rowFieldsId ||
        id === columnFieldsId
      )
        return id;
      if (availableFields.some((x) => x.id === id)) return availableFieldsId;
      if (rowFields.some((x) => x.id === id)) return rowFieldsId;
      if (columnFields.some((x) => x.id === id)) return columnFieldsId;

      return null;
    },
    [availableFields, rowFields, columnFields],
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

      // drop field into Values slot / container
      const draggedField = getDraggedField(active);
      if (draggedField) {
        const slot = parseValueFnSlotId(overId);
        if (slot) {
          changeValueFnArg(slot.valueFnId, slot.argIndex, draggedField.name);

          return;
        }

        const overValueFnRow = parseValueFnRowId(overId);
        if (overId === valueFunctionsContainerId || overValueFnRow) {
          addValueFnWithField(draggedField.name);

          return;
        }
      }

      // Available <-> Rows/Columns + sorting Rows/Columns
      const sourceContainer = findFieldContainerId(activeId);
      if (!sourceContainer) return;

      const destContainer =
        overId === availableFieldsId ||
        overId === rowFieldsId ||
        overId === columnFieldsId
          ? (overId as FieldContainerId)
          : findFieldContainerId(overId);

      if (!destContainer) return;

      if (sourceContainer === destContainer) {
        // sortable: rows/columns
        if (sourceContainer === rowFieldsId) {
          if (overId === rowFieldsId) return;
          const oldIndex = rowFields.findIndex((x) => x.id === activeId);
          const newIndex = rowFields.findIndex((x) => x.id === overId);
          if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
          setRowFields((prev) => arrayMove(prev, oldIndex, newIndex));
          triggerUserAction();
        }

        if (sourceContainer === columnFieldsId) {
          if (overId === columnFieldsId) return;
          const oldIndex = columnFields.findIndex((x) => x.id === activeId);
          const newIndex = columnFields.findIndex((x) => x.id === overId);
          if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
          setColumnFields((prev) => arrayMove(prev, oldIndex, newIndex));
          triggerUserAction();
        }

        return;
      }

      // move from available -> rows/columns
      if (
        sourceContainer === availableFieldsId &&
        destContainer === rowFieldsId
      ) {
        const item = getItemById(activeId);
        if (item) addRowField(item);

        return;
      }

      if (
        sourceContainer === availableFieldsId &&
        destContainer === columnFieldsId
      ) {
        const item = getItemById(activeId);
        if (item) addColumnField(item);

        return;
      }

      // remove rows/columns -> available
      if (
        sourceContainer === rowFieldsId &&
        destContainer === availableFieldsId
      ) {
        removeRowField(activeId);

        return;
      }

      if (
        sourceContainer === columnFieldsId &&
        destContainer === availableFieldsId
      ) {
        removeColumnField(activeId);
      }
    },
    [
      addColumnField,
      addRowField,
      addValueFnWithField,
      changeValueFnArg,
      columnFields,
      findFieldContainerId,
      getDraggedField,
      getItemById,
      removeColumnField,
      removeRowField,
      rowFields,
      setColumnFields,
      setRowFields,
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
        sourceContainer === availableFieldsId &&
        targetContainer === columnFieldsId
      ) {
        addColumnField(item);

        return;
      }

      if (
        sourceContainer === rowFieldsId &&
        targetContainer === availableFieldsId
      ) {
        removeRowField(itemId);

        return;
      }

      if (
        sourceContainer === columnFieldsId &&
        targetContainer === availableFieldsId
      ) {
        removeColumnField(itemId);
      }
    },
    [
      addColumnField,
      addRowField,
      getItemById,
      removeColumnField,
      removeRowField,
    ],
  );

  const getMenuItems = useCallback(
    (
      itemId: string,
      containerId: ContainerId,
      onMoveItem: OnMoveItem,
    ): MenuProps['items'] => {
      const items: MenuProps['items'] = [];
      const draggableItemPath = ['PivotTableWizard', itemId];

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
          getDropdownItem({
            key: 'move-to-columns',
            label: 'Move to Columns',
            fullPath: [...draggableItemPath, 'MoveToColumns'],
            onClick: () => onMoveItem(itemId, containerId, columnFieldsId),
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

      if (containerId === columnFieldsId) {
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
              className="flex-1 min-h-0"
              emptyItemsMessage="Drag columns here"
              getMenuItems={getMenuItems}
              icon={<RowsIcon />}
              id={rowFieldsId}
              items={rowFields}
              title="Rows"
              onMoveItem={handleMoveItem}
            />

            <DropArea
              className="flex-1 min-h-0"
              emptyItemsMessage="Drag columns here"
              getMenuItems={getMenuItems}
              icon={<RowsIcon />}
              id={columnFieldsId}
              items={columnFields}
              title="Columns"
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
          maxRows={1}
          valueFunctions={valueFunctions}
          onAddEmpty={addEmptyValueFn}
          onChangeArg={changeValueFnArg}
          onChangeFunction={changeValueFnFunction}
          onRemoveRow={() => removeValueFnRow()}
        />
      </div>
    </DndContext>
  );
}
