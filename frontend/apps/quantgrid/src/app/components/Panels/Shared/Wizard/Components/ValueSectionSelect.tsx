import cx from 'classnames';
import { useMemo } from 'react';
import Select, { GroupBase, SingleValue } from 'react-select';

import { SelectCompactClasses, SelectOption } from '@frontend/common';

export function ValueSectionSelect({
  options,
  value,
  placeholder,
  onChange,
  className,
}: {
  options: SelectOption[];
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
    <Select<SelectOption, false, GroupBase<SelectOption>>
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
      onChange={(opt: SingleValue<SelectOption>) => {
        const val = opt ? (opt.value as string) : undefined;
        onChange(val);
      }}
    />
  );
}
