import cx from 'classnames';
import { DefaultOptionType } from 'rc-select/lib/Select';
import {
  ClassNamesConfig,
  components,
  GroupBase,
  OptionProps,
  SingleValueProps,
} from 'react-select';

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
          className="text-textSecondary w-[20px] mr-2"
          component={() => {
            return props.data.icon;
          }}
        />
        <span className="text-textPrimary">{props.data.label}</span>
      </div>
    </components.SingleValue>
  );
};

export const OptionWithIcon = (
  props: OptionProps<DefaultOptionType, boolean, GroupBase<DefaultOptionType>>
) => {
  return (
    <components.Option {...props}>
      <div className="flex items-center">
        <Icon
          className="text-textSecondary w-[20px] mr-2"
          component={() => {
            return props.data.icon;
          }}
        />
        <span className="text-textPrimary">{props.label}</span>
      </div>
    </components.Option>
  );
};

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
        <span className="text-textPrimary">{props.data.label}</span>
      </div>
    </components.SingleValue>
  );
};

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
        <span className="text-textPrimary">{props.label}</span>
      </div>
    </components.Option>
  );
};

export const ChartPanelSelectClasses: ClassNamesConfig<
  DefaultOptionType,
  boolean,
  GroupBase<any>
> = {
  control: ({ menuIsOpen }) =>
    cx(
      '!min-h-7 !bg-bgLayer3 !text-textPrimary hover:!border-strokeAccentPrimary !shadow-none text-[13px]',
      menuIsOpen ? '!border-strokeAccentPrimary' : '!border-strokeTertiary'
    ),
  valueContainer: () => '!pr-0',
  dropdownIndicator: () => 'hover:!text-strokeHover !pl-0 !py-0',
  container: () => '!w-full',
  input: () => '!m-0 !p-0',
};
