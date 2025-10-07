import cx from 'classnames';
import { DefaultOptionType } from 'rc-select/lib/Select';
import { ClassNamesConfig, GroupBase, StylesConfig } from 'react-select';

export const inputClasses = cx(
  'rounded-[3px] border border-stroke-tertiary! bg-bg-layer-3! text-text-primary ',
  'focus:bg-bg-layer-3! focus:border-stroke-accent-primary!',
  'focus-within:bg-bg-layer-3! focus-within:shadow-none! focus:shadow-none! focus-within:border-stroke-accent-primary!',
  'hover:bg-bg-layer-3! hover:border-stroke-accent-primary!',
  'disabled:border-stroke-tertiary! disabled:text-controls-text-disable disabled:placeholder:text-controls-text-disable'
);

export const primaryButtonClasses =
  'border-controls-bg-accent rounded-[3px] leading-none bg-controls-bg-accent! text-controls-text-permanent! shadow-none! focus:outline-0! focus-visible:outline-0! focus:border! focus:border-stroke-hover-focus! focus:bg-controls-bg-accent-hover! hover:border-controls-bg-accent-hover! hover:bg-controls-bg-accent-hover! hover:text-controls-text-permanent!';

export const primaryDisabledButtonClasses =
  'disabled:text-controls-text-disable disabled:bg-controls-bg-disable!';

export const secondaryButtonClasses =
  'border-stroke-primary rounded-[3px] text-text-primary! bg-bg-layer-2! shadow-none! hover:border-bg-layer-4! hover:bg-bg-layer-4! hover:text-text-primary! focus:outline-0! focus-visible:outline-0! focus:border! focus:border-stroke-hover-focus! focus:bg-bg-layer-4!';

export const secondaryOutlineButtonClasses =
  'max-md:h-7 border-stroke-primary rounded-[3px] leading-none text-text-primary! bg-transparent! shadow-none! hover:border-bg-layer-4! hover:bg-bg-layer-4! hover:text-text-primary! focus:outline-0! focus-visible:outline-0! focus:border! focus:border-stroke-hover-focus! focus:bg-bg-layer-4!';

export const secondaryOutlineInvertedButtonClasses =
  'border-stroke-primary rounded-[3px] text-text-inverted! bg-transparent! shadow-none! hover:border-bg-layer-4! hover:bg-bg-layer-4! hover:text-text-primary! focus:text-text-primary! focus:outline-0! focus-visible:outline-0! focus:border! focus:border-stroke-hover-focus! focus:bg-bg-layer-4!';

export const secondaryErrorButtonClasses =
  'border-stroke-error rounded-[3px] text-text-error! bg-transparent! shadow-none! hover:border-text-accent-tertiary! hover:text-text-accent-tertiary!';

export const secondaryDisabledButtonClasses =
  'disabled:text-controls-text-disable! disabled:bg-bg-layer-2! disabled:cursor-not-allowed!';

export const modalFooterButtonClasses = 'h-9 text-[13px]';

export const selectedTabClasses =
  'bg-bg-accent-primary-alpha border-b-2 border-b-stroke-accent-primary! hover:bg-bg-accent-primary-alpha! focus:bg-bg-accent-primary-alpha! focus:border-b-stroke-accent-primary! focus-visible:bg-stroke-accent-primary!';

export const notSelectedTabClasses =
  'bg-bg-layer-4 hover:bg-bg-accent-primary-alpha! focus:bg-bg-accent-primary-alpha! focus-visible:bg-bg-accent-primary-alpha!';

export const defaultTabClasses =
  'flex items-center rounded-[3px] text-text-primary! border-0 shadow-none focus:outline-0! focus-visible:outline-0! transition-none!';

export const iconClasses =
  'text-text-secondary cursor-pointer hover:text-text-accent-primary';

export const SelectClasses: ClassNamesConfig<
  DefaultOptionType,
  boolean,
  GroupBase<any>
> = {
  control: ({ menuIsOpen }) =>
    cx(
      'bg-bg-layer-3! text-text-primary! hover:border-stroke-accent-primary! shadow-none! text-[13px]',
      menuIsOpen ? 'border-stroke-accent-primary!' : 'border-stroke-tertiary!'
    ),
  menu: () => 'bg-bg-layer-0! text-[13px] rounded-[3px]!',
  menuList: () => 'thin-scrollbar',
  singleValue: () => 'text-text-primary! select-none',
  multiValue: () => 'text-text-primary! select-none',
  indicatorsContainer: () => 'text-text-primary!',
  dropdownIndicator: () => 'hover:text-stroke-hover! pl-0!',
  option: ({ isSelected, isDisabled }) =>
    cx(
      isSelected
        ? isDisabled
          ? 'bg-bg-accent-primary-alpha! !text-controls-text-disabled'
          : 'bg-bg-accent-primary-alpha! text-text-accent-primary!'
        : isDisabled
        ? 'bg-bg-layer-0! !text-controls-text-disabled'
        : 'bg-bg-layer-0! text-text-primary! hover:bg-bg-accent-primary-alpha!'
    ),
};

export const selectStyles: StylesConfig<
  DefaultOptionType,
  boolean,
  GroupBase<DefaultOptionType>
> = {
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};
