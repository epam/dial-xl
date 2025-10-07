import { DefaultOptionType } from 'rc-select/lib/Select';
import { components, GroupBase, SingleValueProps } from 'react-select';

import Icon from '@ant-design/icons';

export const CustomSingleValueWithIcon = (
  props: SingleValueProps<
    DefaultOptionType,
    boolean,
    GroupBase<DefaultOptionType>
  >
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
