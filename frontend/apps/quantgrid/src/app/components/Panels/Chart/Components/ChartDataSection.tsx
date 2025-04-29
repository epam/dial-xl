import { Tooltip } from 'antd';
import { Fragment, useCallback, useContext, useEffect, useState } from 'react';

import Icon from '@ant-design/icons';
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CircleRemove,
  DragCardIcon,
  isNumericType,
  SeparatorHorizontalIcon,
  toExcelColumnName,
} from '@frontend/common';
import {
  chartSeparatorDecoratorName,
  ParsedField,
  ParsedTable,
} from '@frontend/parser';

import {
  AppSpreadsheetInteractionContext,
  ProjectContext,
  ViewportContext,
} from '../../../../context';
import { useChartEditDsl, useFieldEditDsl } from '../../../../hooks';

type Section = Record<string | number, string[]>;

export function ChartDataSection({
  parsedTable,
}: {
  parsedTable: ParsedTable;
}) {
  const { openTable } = useContext(AppSpreadsheetInteractionContext);
  const { viewGridData } = useContext(ViewportContext);
  const { sheetName } = useContext(ProjectContext);
  const { updateChartSections } = useChartEditDsl();
  const { removeFieldDecorator, setFieldDecorator } = useFieldEditDsl();
  const [sections, setSections] = useState<Section>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleRemoveSeparator = useCallback(
    (sectionIndex: number) => {
      if (!sheetName) return;

      const { tableName } = parsedTable;

      const nextSectionKey = Object.keys(sections).find(
        (key, index) => index === sectionIndex + 1
      );

      if (!nextSectionKey || !sections[nextSectionKey].length) return;

      const fieldName = sections[nextSectionKey][0];
      const historyTitle = `Remove chart separator before ${tableName}[${fieldName}]`;
      removeFieldDecorator(
        tableName,
        fieldName,
        chartSeparatorDecoratorName,
        historyTitle
      );

      openTable(sheetName, tableName);
    },
    [openTable, parsedTable, removeFieldDecorator, sections, sheetName]
  );

  const handleAddSeparator = useCallback(
    (fieldName: string) => {
      if (!sheetName) return;

      const { tableName } = parsedTable;

      const historyTitle = `Add separator before ${tableName}[${fieldName}]`;
      setFieldDecorator(
        tableName,
        fieldName as string,
        chartSeparatorDecoratorName,
        '',
        historyTitle
      );

      openTable(sheetName, tableName);
    },
    [setFieldDecorator, openTable, parsedTable, sheetName]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const findContainer = useCallback(
    (id: string | number) => {
      if (id in sections) {
        return id;
      }

      return Object.keys(sections).find((key) =>
        sections[key].includes(id as string)
      );
    },
    [sections]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      const activeContainer = findContainer(active.id);

      if (!activeContainer) {
        setActiveId(null);

        return;
      }

      const overId = over?.id;

      if (overId == null) {
        setActiveId(null);

        return;
      }

      const overContainer = findContainer(overId);

      if (overContainer) {
        const activeIndex = sections[activeContainer].indexOf(
          active.id as string
        );
        const overIndex = sections[overContainer].indexOf(overId as string);

        if (activeIndex !== overIndex) {
          const updatedSections = {
            ...sections,
            [overContainer]: arrayMove(
              sections[overContainer],
              activeIndex,
              overIndex
            ),
          };

          setSections(updatedSections);

          updateChartSections(parsedTable.tableName, updatedSections);
        } else {
          updateChartSections(parsedTable.tableName, sections);
        }
      }

      setActiveId(null);
    },
    [findContainer, parsedTable, sections, updateChartSections]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;

      const overId = over?.id;

      if (overId == null || active.id in sections) {
        return;
      }

      const overContainer = findContainer(overId);
      const activeContainer = findContainer(active.id);

      if (!overContainer || !activeContainer) {
        return;
      }

      if (activeContainer !== overContainer) {
        setSections((items) => {
          const activeItems = items[activeContainer];
          const overItems = items[overContainer];
          const overIndex = overItems.indexOf(overId as string);
          const activeIndex = activeItems.indexOf(active.id as string);

          let newIndex: number;

          if (overId in items) {
            newIndex = overItems.length + 1;
          } else {
            const isBelowOverItem =
              over &&
              active.rect.current.translated &&
              active.rect.current.translated.top >
                over.rect.top + over.rect.height;

            const modifier = isBelowOverItem ? 1 : 0;

            newIndex =
              overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
          }

          return {
            ...items,
            [activeContainer]: items[activeContainer].filter(
              (item) => item !== active.id
            ),
            [overContainer]: [
              ...items[overContainer].slice(0, newIndex),
              items[activeContainer][activeIndex],
              ...items[overContainer].slice(
                newIndex,
                items[overContainer].length
              ),
            ],
          };
        });
      }
    },
    [findContainer, sections]
  );

  useEffect(() => {
    const chartSections: ParsedField[][] =
      parsedTable.getChartSeparatedSections();

    const updatedSections: Section = {};

    const tableData = viewGridData.getTableData(parsedTable.tableName);
    const { types } = tableData;

    chartSections.forEach((fields, index) => {
      const title = `Group ${toExcelColumnName(index)}`;

      updatedSections[title] = fields
        .filter((f) => {
          const fieldType = types[f.key.fieldName];

          return (
            !(fieldType && !isNumericType(fieldType)) &&
            !f.isChartXAxis() &&
            !f.isChartSelector() &&
            !f.isChartDotColor() &&
            !f.isChartDotSize() &&
            !f.isDynamic
          );
        })
        .map((field) => field.key.fieldName);
    });

    setSections(updatedSections);
  }, [parsedTable, viewGridData]);

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragStart={handleDragStart}
    >
      <div className="flex flex-col">
        {Object.keys(sections).map((sectionKey, index) => {
          return (
            <SortableContext
              id={sectionKey}
              items={sections[sectionKey]}
              key={sectionKey}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col mb-2" key={sectionKey}>
                {Object.keys(sections).length > 1 && (
                  <div className="text-[12px] text-textSecondary mb-1">
                    {sectionKey}
                  </div>
                )}

                {sections[sectionKey].map((fieldName, fieldIndex) => (
                  <Fragment key={fieldName}>
                    <DraggableField fieldName={fieldName} />

                    {fieldIndex !== sections[sectionKey].length - 1 && (
                      <div
                        className="relative group w-full hover:cursor-pointer"
                        onClick={() =>
                          handleAddSeparator(
                            sections[sectionKey][fieldIndex + 1]
                          )
                        }
                      >
                        <div className="h-2 bg-transparent w-full" />
                        <Tooltip placement="right" title="Add separator here">
                          <Icon
                            className="w-[18px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition"
                            component={() => (
                              <SeparatorHorizontalIcon secondaryAccentCssVar="text-accent-primary" />
                            )}
                          />
                        </Tooltip>
                      </div>
                    )}
                  </Fragment>
                ))}

                {index !== Object.keys(sections).length - 1 && (
                  <div
                    className="relative group w-full mt-3 hover:cursor-pointer"
                    onClick={() => handleRemoveSeparator(index)}
                  >
                    <div className="h-0.5 bg-strokePrimary w-full" />
                    <Tooltip placement="right" title="Remove separator">
                      <Icon
                        className="w-[18px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition text-accent-primary"
                        component={() => <CircleRemove />}
                      />
                    </Tooltip>
                  </div>
                )}
              </div>
            </SortableContext>
          );
        })}
      </div>
      <DragOverlay>
        {activeId ? <DraggableField fieldName={activeId} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function DraggableField({
  fieldName,
  isOverlay = false,
}: {
  fieldName: string;
  isOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: fieldName });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    boxShadow: isOverlay ? '0 0 8px rgba(0,0,0,0.2)' : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!isOverlay ? attributes : {})}
      {...(!isOverlay ? listeners : {})}
      className="flex items-center h-7 w-full px-2 rounded-[3px] border border-strokePrimary bg-bgLayer2 cursor-grab active:cursor-grabbing"
    >
      <Icon
        className="w-[18px] mr-1 text-textPrimary"
        component={() => <DragCardIcon />}
      />
      <span className="text-[13px] text-textPrimary">{fieldName}</span>
    </div>
  );
}
