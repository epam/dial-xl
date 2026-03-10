import { InputNumber } from 'antd';
import cx from 'classnames';
import { KeyboardEvent, useCallback } from 'react';

import { inputClasses } from '@frontend/common';

import { minTablePlacement } from '../Wizard';

interface PositionInputsProps {
  startRow: number | null;
  startCol: number | null;
  setStartRow: (row: number | null) => void;
  setStartCol: (col: number | null) => void;
}

export function PositionInputs({
  startRow,
  startCol,
  setStartRow,
  setStartCol,
}: PositionInputsProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      const { key, ctrlKey, altKey, metaKey } = event;

      if (ctrlKey || altKey || metaKey) return;

      if (key.length === 1 && !/^\d$/.test(key)) {
        event.preventDefault();
      }
    },
    [],
  );

  return (
    <div className="flex flex-col items-start">
      <div className="flex items-center mb-2">
        <span className="min-w-[100px] text-[13px] text-text-primary">
          Start Row:
        </span>
        <InputNumber
          className={cx('h-7 w-max-[350px] text-[13px]', inputClasses)}
          id="startRow"
          min={minTablePlacement}
          placeholder="Start row"
          value={startRow}
          onChange={(v) => setStartRow(v)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="flex items-center mb-2">
        <span className="min-w-[100px] text-[13px] text-text-primary">
          Start Column:
        </span>
        <InputNumber
          className={cx('h-7 w-max-[350px] text-[13px]', inputClasses)}
          id="startColumn"
          min={minTablePlacement}
          placeholder="Start column"
          value={startCol}
          onChange={(v) => setStartCol(v)}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
}
