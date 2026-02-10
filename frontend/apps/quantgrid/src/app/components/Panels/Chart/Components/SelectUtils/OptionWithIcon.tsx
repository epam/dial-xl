import { DefaultOptionType } from 'rc-select/lib/Select';
import { components, GroupBase, OptionProps } from 'react-select';

import Icon from '@ant-design/icons';

export const OptionWithIcon = (
  props: OptionProps<DefaultOptionType, boolean, GroupBase<DefaultOptionType>>
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
