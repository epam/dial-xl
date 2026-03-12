import type { ReactNode } from 'react';
import { components, GroupBase, OptionProps } from 'react-select';

import Icon from '@ant-design/icons';
import { SelectOption } from '@frontend/common';

export type OptionWithIconType = SelectOption & {
  icon?: ReactNode;
};

export const OptionWithIcon = <T extends OptionWithIconType>(
  props: OptionProps<T, boolean, GroupBase<T>>,
) => {
  return (
    <components.Option {...props}>
      <div className="flex items-center">
        <Icon
          className="text-text-secondary w-[20px] mr-2"
          component={() => {
            return props.data.icon;
          }}
        />
        <span className="text-text-primary">{props.label}</span>
      </div>
    </components.Option>
  );
};
