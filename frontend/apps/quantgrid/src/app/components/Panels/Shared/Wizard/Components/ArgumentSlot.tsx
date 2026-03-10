import cx from 'classnames';
import { useMemo } from 'react';

import { useDroppable } from '@dnd-kit/core';
import { DefaultOptionType } from '@rc-component/select/lib/Select';

import { ColumnRef } from '../types';
import { makeValueFnSlotId } from './valueFunctionSectionUtils';
import { ValueSectionSelect } from './ValueSectionSelect';

export function ArgumentSlot({
  rowId,
  index,
  arg,
  fieldOptions,
  onChangeArg,
}: {
  rowId: string;
  index: number;
  arg: ColumnRef | null;
  fieldOptions: DefaultOptionType[];
  onChangeArg: (rowId: string, argIndex: number, fieldName?: string) => void;
}) {
  const slotId = useMemo(() => makeValueFnSlotId(rowId, index), [index, rowId]);
  const { isOver, setNodeRef } = useDroppable({ id: slotId });

  return (
    <div
      className={cx(
        'min-w-0 flex items-center rounded-[3px]',
        'flex-[1_1_120px] min-w-30',
        'border-2 border-dashed border-transparent p-px transition-colors',
        isOver && 'border-stroke-accent-primary!',
      )}
      ref={setNodeRef}
    >
      <ValueSectionSelect
        className="w-full min-w-0"
        options={fieldOptions}
        placeholder="Column"
        value={arg?.name}
        onChange={(v) => onChangeArg(rowId, index, v)}
      />
    </div>
  );
}
