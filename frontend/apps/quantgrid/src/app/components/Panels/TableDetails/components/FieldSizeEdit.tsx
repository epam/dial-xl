import { InputNumber } from 'antd';
import cx from 'classnames';
import { KeyboardEvent, useCallback, useEffect, useState } from 'react';

import { inputClasses, KeyboardCode } from '@frontend/common';
import { ParsedField } from '@frontend/parser';

import { useFieldEditDsl } from '../../../../hooks';

const minSize = 1;
const maxSize = 10;

export function FieldSizeEdit({ parsedField }: { parsedField: ParsedField }) {
  const { onChangeFieldColumnSize } = useFieldEditDsl();
  const [size, setSize] = useState<number>(minSize);

  const handleChangeSize = useCallback(() => {
    if (size < minSize || size > maxSize || !parsedField) return;

    const { key } = parsedField;
    const { fieldName, tableName } = key;
    const currentValue = parsedField.getSize();
    const valueAdd =
      currentValue > size ? -1 * (currentValue - size) : size - currentValue;

    onChangeFieldColumnSize(tableName, fieldName, valueAdd);
  }, [onChangeFieldColumnSize, parsedField, size]);

  const initFieldValues = useCallback(() => {
    setSize(parsedField ? parsedField.getSize() : minSize);
  }, [parsedField]);

  useEffect(() => {
    if (!parsedField) return;

    initFieldValues();
  }, [initFieldValues, parsedField]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      const { key, ctrlKey, altKey, metaKey } = event;

      if (ctrlKey || altKey || metaKey) return;

      if (key.length === 1 && !/^\d$/.test(key)) {
        event.preventDefault();
      }

      if (key === KeyboardCode.Escape) {
        initFieldValues();
      }

      return;
    },
    [initFieldValues]
  );

  return (
    <div className="flex items-center mt-2">
      <span className="min-w-[70px] text-[13px] text-text-primary">Size</span>
      <InputNumber
        className={cx('h-7 w-max-[350px] text-[13px]', inputClasses)}
        id="fieldSize"
        max={maxSize}
        min={minSize}
        placeholder="Size"
        value={size}
        onBlur={handleChangeSize}
        onChange={(v) => setSize(v || minSize)}
        onKeyDown={handleKeyDown}
        onPressEnter={handleChangeSize}
      />
    </div>
  );
}
