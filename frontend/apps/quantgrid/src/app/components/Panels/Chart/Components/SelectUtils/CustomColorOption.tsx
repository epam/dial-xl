import { components, GroupBase, OptionProps } from 'react-select';

import { SelectOption } from '@frontend/common';

export type ColorSelectOption = SelectOption & {
  value: string;
  label: string;
  color?: string;
};

export const CustomColorOption = <T extends ColorSelectOption>(
  props: OptionProps<T, boolean, GroupBase<T>>,
) => {
  return (
    <components.Option {...props}>
      <div className="flex items-center">
        <div
          className="h-4 w-4 mr-2 rounded-full"
          style={{ backgroundColor: props.data.color }}
        ></div>
        <span className="text-text-primary">{props.label}</span>
      </div>
    </components.Option>
  );
};
