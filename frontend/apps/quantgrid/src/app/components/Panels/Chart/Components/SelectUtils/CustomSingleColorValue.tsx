import { DefaultOptionType } from 'rc-select/lib/Select';
import { components, GroupBase, SingleValueProps } from 'react-select';

export const CustomSingleColorValue = (
  props: SingleValueProps<
    DefaultOptionType,
    boolean,
    GroupBase<DefaultOptionType>
  >
) => {
  return (
    <components.SingleValue {...props}>
      <div className="flex items-center">
        <div
          className="h-4 w-4 mr-2 rounded-full"
          style={{ backgroundColor: props.data.color }}
        ></div>
        <span className="text-text-primary">{props.data.label}</span>
      </div>
    </components.SingleValue>
  );
};
