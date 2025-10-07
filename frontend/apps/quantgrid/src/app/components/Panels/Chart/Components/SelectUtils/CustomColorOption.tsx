import { DefaultOptionType } from 'rc-select/lib/Select';
import { components, GroupBase, OptionProps } from 'react-select';

export const CustomColorOption = (
  props: OptionProps<DefaultOptionType, boolean, GroupBase<DefaultOptionType>>
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
