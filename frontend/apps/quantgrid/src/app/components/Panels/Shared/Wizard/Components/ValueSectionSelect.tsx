import cx from 'classnames';
import { useMemo } from 'react';
import Select, { SingleValue } from 'react-select';

import { SelectCompactClasses } from '@frontend/common';
import { DefaultOptionType } from '@rc-component/select/lib/Select';

export function ValueSectionSelect({
  options,
  value,
  placeholder,
  onChange,
  className,
}: {
  options: DefaultOptionType[];
  value?: string;
  placeholder?: string;
  onChange: (v?: string) => void;
  className?: string;
}) {
  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  return (
    <Select
      className={cx('text-[13px]', className)}
      classNames={{ ...SelectCompactClasses, clearIndicator: () => 'p-0!' }}
      components={{
        IndicatorSeparator: null,
      }}
      isSearchable={false}
      menuPortalTarget={document.body}
      menuPosition="fixed"
      options={options}
      placeholder={placeholder}
      value={selected}
      isClearable
      onChange={(opt: SingleValue<DefaultOptionType>) => {
        const val = opt ? (opt.value as string) : undefined;
        onChange(val);
      }}
    />
  );
}
