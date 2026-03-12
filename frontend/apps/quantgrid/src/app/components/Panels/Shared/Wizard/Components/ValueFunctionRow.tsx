import { Popover, Tooltip } from 'antd';
import cx from 'classnames';
import { useMemo } from 'react';

import Icon from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import {
  CloseIcon,
  DragCardIcon,
  ExclamationCircleIcon,
  SelectOption,
} from '@frontend/common';

import { ValueFunctionItem } from '../types';
import { ArgumentSlot } from './ArgumentSlot';
import { getValueFunctionRowErrors } from './getValueFunctionRowErrors';
import { makeValueFnRowId } from './valueFunctionSectionUtils';
import { ValueSectionSelect } from './ValueSectionSelect';

export function ValueFunctionRow({
  row,
  fnOptions,
  fieldOptions,
  onRemoveRow,
  onChangeFunction,
  onChangeArg,
}: {
  row: ValueFunctionItem;
  fnOptions: SelectOption[];
  fieldOptions: SelectOption[];
  onRemoveRow: (rowId: string) => void;
  onChangeFunction: (rowId: string, fnName?: string) => void;
  onChangeArg: (rowId: string, argIndex: number, fieldName?: string) => void;
}) {
  const sortableId = useMemo(() => makeValueFnRowId(row.id), [row]);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId,
  });

  const rowErrors = useMemo(() => getValueFunctionRowErrors(row), [row]);

  const popoverContent = (
    <div className="max-w-90 p-2">
      <div className="text-[12px] text-text-primary mb-2">
        Fix to save changes:
      </div>

      <ul className="list-disc pl-4 space-y-1 text-[12px] text-text-secondary">
        {rowErrors.map((e, i) => (
          <li key={`${e}-${i}`}>
            <span className="text-text-primary">{e}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div
      className={cx(
        'px-2 py-2 mb-2 rounded-[3px] text-[13px] bg-bg-layer-4 group hover:opacity-80 min-w-0',
        'grid grid-cols-[auto,1fr,auto] items-start gap-2',
        isDragging ? 'opacity-50' : 'opacity-100',
      )}
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="inline-flex items-center cursor-grab text-text-secondary pt-0.5"
          {...listeners}
          {...attributes}
        >
          <Icon
            className="w-4.5 shrink-0 mr-1 text-text-secondary"
            component={() => <DragCardIcon />}
          />
        </span>

        <div className="flex items-start gap-2 pt-0.5">
          {rowErrors.length > 0 && (
            <Popover
              content={popoverContent}
              placement="bottomLeft"
              trigger={['hover', 'click']}
            >
              <Icon
                className="w-4.5 text-text-warning cursor-pointer"
                component={() => <ExclamationCircleIcon />}
              />
            </Popover>
          )}

          <span className="w-4.5 shrink-0 cursor-pointer text-text-secondary">
            <Tooltip placement="top" title="Remove" destroyOnHidden>
              <Icon
                component={() => <CloseIcon />}
                onClick={() => onRemoveRow(row.id)}
              />
            </Tooltip>
          </span>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-start gap-2 min-w-0">
          <ValueSectionSelect
            className="max-w-37.5 min-w-[150px] flex-[1_1_150px] border-2 border-transparent p-px"
            options={fnOptions}
            placeholder="Function"
            value={row.functionName}
            onChange={(v) => onChangeFunction(row.id, v)}
          />

          {row.args.map((arg, idx) => (
            <ArgumentSlot
              arg={arg}
              fieldOptions={fieldOptions}
              index={idx}
              key={idx}
              rowId={row.id}
              onChangeArg={onChangeArg}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
