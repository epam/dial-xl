import cx from 'classnames';
import type { DefaultOptionType } from 'rc-select/lib/Select';
import { useCallback, useMemo } from 'react';
import Select, { SingleValue } from 'react-select';

import { SelectClasses, selectStyles } from '@frontend/common';

import {
  CustomSingleValueWithIcon,
  OptionWithIcon,
} from '../../Chart/Components/SelectUtils';

type FormSelectProps = {
  value?: string | null;
  onChange?: (val: string | null) => void;
  onValueChange?: (val: string | null) => void;
  options: DefaultOptionType[];
  placeholder?: string;
  isClearable?: boolean;
  isSearchable?: boolean;
  zoom?: number;
  noOptionsMessage?: () => string;
  className?: string;
  showIcon?: boolean;
};

export function FormSelect({
  value,
  onChange,
  onValueChange,
  options,
  placeholder = 'Select...',
  isClearable = true,
  isSearchable = true,
  noOptionsMessage = () => 'No options found',
  className,
  showIcon = false,
}: FormSelectProps) {
  const selected = (() => {
    if (value == null) return null;
    const found = options.find((o) => o.value === value);

    return found
      ? { value: found.value, label: found.label, icon: found?.icon }
      : null;
  })();

  const getSingleSelectOptionStyles = useCallback((isSelected: boolean) => {
    return cx(
      isSelected
        ? 'bg-bg-accent-primary-alpha! text-text-accent-primary!'
        : 'bg-bg-layer-0! text-text-primary! hover:bg-bg-accent-primary-alpha!'
    );
  }, []);

  const components = useMemo(() => {
    return showIcon
      ? {
          IndicatorSeparator: null,
          Option: OptionWithIcon,
          SingleValue: CustomSingleValueWithIcon,
        }
      : {
          IndicatorSeparator: null,
        };
  }, [showIcon]);

  return (
    <Select
      className={className}
      classNames={{
        ...SelectClasses,
        control: ({ menuIsOpen }) =>
          cx(
            'bg-bg-layer-2! text-text-primary! hover:border-stroke-accent-primary! shadow-none! text-[13px]',
            menuIsOpen
              ? 'border-stroke-accent-primary!'
              : 'border-stroke-primary!'
          ),
        input: () => 'm-0! p-0!',
        clearIndicator: () => 'p-0!',
        container: () => '!w-full',
        option: ({ isSelected }) => getSingleSelectOptionStyles(isSelected),
      }}
      components={components}
      isClearable={isClearable}
      isSearchable={isSearchable}
      menuPosition="fixed"
      noOptionsMessage={noOptionsMessage}
      options={options}
      placeholder={placeholder}
      styles={selectStyles}
      value={selected}
      onChange={(opt: SingleValue<DefaultOptionType>) => {
        const val = opt ? (opt.value as string) : null;
        onChange?.(val);
        onValueChange?.(val);
      }}
    />
  );
}
