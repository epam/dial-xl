import cx from 'classnames';
import { ClassNamesConfig, GroupBase } from 'react-select';

import { SelectOption } from '@frontend/common';

export const ChartPanelSelectClasses: ClassNamesConfig<
  SelectOption,
  boolean,
  GroupBase<any>
> = {
  control: ({ menuIsOpen }) =>
    cx(
      '!min-h-7 !bg-bg-layer-3 !text-text-primary hover:!border-stroke-accent-primary !shadow-none text-[13px]',
      menuIsOpen ? '!border-stroke-accent-primary' : '!border-stroke-tertiary',
    ),
  valueContainer: () => '!pr-0',
  dropdownIndicator: () => 'hover:!text-stroke-hover !pl-0 !py-0',
  container: () => '!w-full',
  input: () => '!m-0 !p-0',
};
