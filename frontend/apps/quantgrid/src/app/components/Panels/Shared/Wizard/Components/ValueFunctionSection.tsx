import { Popover, Tooltip } from 'antd';
import cx from 'classnames';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import Icon from '@ant-design/icons';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ExclamationCircleIcon, PlusIcon, TotalIcon } from '@frontend/common';

import { FieldItem } from '../constants';
import { AggregationFunctionInfo, ValueFunctionItem } from '../types';
import { getValueFunctionRowErrors } from './getValueFunctionRowErrors';
import { ValueFunctionRow } from './ValueFunctionRow';
import { makeValueFnRowId } from './valueFunctionSectionUtils';

type Props = {
  id: string;
  aggregationFunctions: AggregationFunctionInfo[];
  availableFields: FieldItem[];
  valueFunctions: ValueFunctionItem[];
  onAddEmpty: () => void;
  onRemoveRow: (rowId: string) => void;
  onChangeFunction: (rowId: string, fnName?: string) => void;
  onChangeArg: (rowId: string, argIndex: number, fieldName?: string) => void;
  maxRows?: number | null;
  heightPx?: string;
};

export function ValuesFunctionsSection({
  id,
  aggregationFunctions,
  availableFields,
  valueFunctions,
  onAddEmpty,
  onRemoveRow,
  onChangeFunction,
  onChangeArg,
  maxRows,
  heightPx = '240px',
}: Props) {
  const { isOver, setNodeRef } = useDroppable({ id });

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const prevCountRef = useRef<number>(valueFunctions.length);

  const setDroppableAndScrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      scrollRef.current = node;
    },
    [setNodeRef],
  );

  useEffect(() => {
    const prev = prevCountRef.current;
    const next = valueFunctions.length;

    if (next > prev) {
      requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (!el) return;

        el.scrollTo({
          top: el.scrollHeight,
          behavior: 'smooth',
        });
      });
    }

    prevCountRef.current = next;
  }, [valueFunctions.length]);

  const canAdd = useMemo(
    () => maxRows == null || valueFunctions.length < maxRows,
    [maxRows, valueFunctions.length],
  );

  const fnOptions = useMemo(
    () => aggregationFunctions.map((f) => ({ value: f.name, label: f.name })),
    [aggregationFunctions],
  );

  const fieldOptions = useMemo(
    () => availableFields.map((f) => ({ value: f.name, label: f.name })),
    [availableFields],
  );

  const sectionErrors = useMemo(() => {
    const rows = valueFunctions.map((row, idx) => {
      const errors = getValueFunctionRowErrors(row);

      return { row, index: idx, errors };
    });

    const hasErrors = rows.some((r) => r.errors.length > 0);

    const popoverContent = hasErrors ? (
      <div className="max-w-90 p-2">
        <div className="text-[12px] text-text-primary mb-2">
          Changes won’t be saved until you fix:
        </div>

        <ul className="list-disc pl-4 space-y-1 text-[12px] text-text-secondary">
          {rows
            .filter((r) => r.errors.length > 0)
            .flatMap((r) =>
              r.errors.map((e, i) => (
                <li key={`${r.row.id}-${i}`}>
                  <span className="text-text-primary">{`Row ${r.index + 1}`}</span>
                  {': '}
                  {e}
                </li>
              )),
            )}
        </ul>
      </div>
    ) : (
      ''
    );

    return { rows, hasErrors, popoverContent };
  }, [valueFunctions]);

  return (
    <div
      className={cx(
        'h-full flex flex-col bg-bg-layer-2 border border-stroke-primary rounded-[3px] min-w-0 min-h-0',
      )}
      style={{ height: heightPx }}
    >
      <div className="flex justify-between p-2">
        <div className="flex items-center min-w-0">
          <Icon
            className="text-text-secondary w-4.5 mr-1"
            component={() => <TotalIcon />}
          />

          <h3 className="text-text-primary text-[12px] leading-4.5">
            Values&nbsp;
            <span className="text-text-secondary">
              ({valueFunctions.length} items)
            </span>
          </h3>

          {sectionErrors.hasErrors && (
            <Popover
              content={sectionErrors.popoverContent}
              placement="bottomLeft"
              trigger={['hover', 'click']}
            >
              <Icon
                className="w-4.5 ml-2 text-text-warning cursor-pointer"
                component={() => <ExclamationCircleIcon />}
              />
            </Popover>
          )}
        </div>

        {canAdd && (
          <Tooltip placement="bottom" title="Add new function" destroyOnHidden>
            <button
              className="size-5 flex items-center cursor-pointer justify-center bg-bg-accent-primary-alpha text-text-accent-primary rounded-full"
              onClick={onAddEmpty}
            >
              <Icon className="w-3" component={() => <PlusIcon />} />
            </button>
          </Tooltip>
        )}
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden min-w-0">
        <div
          className={cx(
            'flex-1 p-2 overflow-y-auto thin-scrollbar transition-colors duration-200 h-full min-w-0 border-2',
            {
              'border-dashed border-stroke-accent-primary': isOver,
              'border-transparent': !isOver,
            },
          )}
          ref={setDroppableAndScrollRef}
        >
          <SortableContext
            items={valueFunctions.map((v) => makeValueFnRowId(v.id))}
            strategy={verticalListSortingStrategy}
          >
            {valueFunctions.map((row) => (
              <ValueFunctionRow
                fieldOptions={fieldOptions}
                fnOptions={fnOptions}
                key={row.id}
                row={row}
                onChangeArg={onChangeArg}
                onChangeFunction={onChangeFunction}
                onRemoveRow={onRemoveRow}
              />
            ))}
          </SortableContext>

          {valueFunctions.length === 0 && (
            <div className="flex items-center justify-center text-[13px] text-text-secondary text-center p-8">
              Drag columns here or click “Add”
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
