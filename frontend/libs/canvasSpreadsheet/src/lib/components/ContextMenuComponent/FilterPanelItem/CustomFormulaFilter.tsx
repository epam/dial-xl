import { Input } from 'antd';
import cx from 'classnames';

import { inputClasses } from '@frontend/common';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function CustomFormulaFilter({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2 mt-2">
      <Input.TextArea
        className={cx('ant-input-md', inputClasses)}
        placeholder={'e.g. [Field] > 0 AND [Field] < 100'}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key !== 'Escape' && e.stopPropagation()}
      />
    </div>
  );
}
