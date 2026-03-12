import { components, GroupBase, SingleValueProps } from 'react-select';

import Icon from '@ant-design/icons';

import { OptionWithIconType } from './OptionWithIcon';

export const CustomSingleValueWithIcon = <T extends OptionWithIconType>(
  props: SingleValueProps<T, boolean, GroupBase<T>>,
) => {
  return (
    <components.SingleValue {...props}>
      <div className="flex items-center">
        <Icon
          className="text-text-secondary w-[20px] mr-2"
          component={() => {
            return props.data.icon;
          }}
        />
        <span className="text-text-primary">{props.data.label}</span>
      </div>
    </components.SingleValue>
  );
};
