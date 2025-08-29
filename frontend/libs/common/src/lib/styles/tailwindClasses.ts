import cx from 'classnames';
import { DefaultOptionType } from 'rc-select/lib/Select';
import { ClassNamesConfig, GroupBase, StylesConfig } from 'react-select';

export const inputClasses = cx(
  'rounded-[3px] border !border-strokeTertiary !bg-bgLayer3 text-textPrimary ',
  'focus:!bg-bgLayer3 focus:!border-strokeAccentPrimary',
  'focus-within:!bg-bgLayer3 focus-within:!shadow-none focus:!shadow-none focus-within:!border-strokeAccentPrimary',
  'hover:!bg-bgLayer3 hover:!border-strokeAccentPrimary',
  'disabled:!border-strokeTertiary disabled:text-controlsTextDisable disabled:placeholder:text-controlsTextDisable'
);

export const primaryButtonClasses =
  'border-controlsBgAccent rounded-[3px] leading-none !bg-controlsBgAccent !text-controlsTextPermanent !shadow-none focus:!outline-0 focus-visible:!outline-0 focus:!border focus:!border-strokeHoverFocus focus:!bg-controlsBgAccentHover hover:!border-controlsBgAccentHover hover:!bg-controlsBgAccentHover hover:!text-controlsTextPermanent';

export const primaryDisabledButtonClasses =
  'disabled:text-controlsTextDisable disabled:!bg-controlsBgDisable';

export const secondaryButtonClasses =
  'border-strokePrimary rounded-[3px] !text-textPrimary !bg-bgLayer2 !shadow-none hover:!border-bgLayer4 hover:!bg-bgLayer4 hover:!text-textPrimary focus:!outline-0 focus-visible:!outline-0 focus:!border focus:!border-strokeHoverFocus focus:!bg-bgLayer4';

export const secondaryOutlineButtonClasses =
  'max-md:h-7 border-strokePrimary rounded-[3px] leading-none !text-textPrimary !bg-transparent !shadow-none hover:!border-bgLayer4 hover:!bg-bgLayer4 hover:!text-textPrimary focus:!outline-0 focus-visible:!outline-0 focus:!border focus:!border-strokeHoverFocus focus:!bg-bgLayer4';

export const secondaryOutlineInvertedButtonClasses =
  'border-strokePrimary rounded-[3px] !text-textInverted !bg-transparent !shadow-none hover:!border-bgLayer4 hover:!bg-bgLayer4 hover:!text-textPrimary focus:!text-textPrimary focus:!outline-0 focus-visible:!outline-0 focus:!border focus:!border-strokeHoverFocus focus:!bg-bgLayer4';

export const secondaryErrorButtonClasses =
  'border-strokeError rounded-[3px] !text-textError !bg-transparent !shadow-none hover:!border-textAccentTertiary hover:!text-textAccentTertiary';

export const secondaryDisabledButtonClasses =
  'disabled:!text-controlsTextDisable disabled:!bg-bgLayer2 disabled:!cursor-not-allowed';

export const modalFooterButtonClasses = 'h-9 text-[13px]';

export const selectedTabClasses =
  'bg-bgAccentPrimaryAlpha border-b-2 !border-b-strokeAccentPrimary hover:!bg-bgAccentPrimaryAlpha focus:!bg-bgAccentPrimaryAlpha focus:!border-b-strokeAccentPrimary focus-visible:!bg-strokeAccentPrimary';

export const notSelectedTabClasses =
  'bg-bgLayer4 hover:!bg-bgAccentPrimaryAlpha focus:!bg-bgAccentPrimaryAlpha focus-visible:!bg-bgAccentPrimaryAlpha';

export const defaultTabClasses =
  'flex items-center rounded-[3px] !text-textPrimary border-0 shadow-none focus:!outline-0 focus-visible:!outline-0 !transition-none';

export const iconClasses =
  'text-textSecondary cursor-pointer hover:text-textAccentPrimary';

export const SelectClasses: ClassNamesConfig<
  DefaultOptionType,
  boolean,
  GroupBase<any>
> = {
  control: ({ menuIsOpen }) =>
    cx(
      '!bg-bgLayer3 !text-textPrimary hover:!border-strokeAccentPrimary !shadow-none text-[13px]',
      menuIsOpen ? '!border-strokeAccentPrimary' : '!border-strokeTertiary'
    ),
  menu: () => '!bg-bgLayer0 text-[13px] !rounded-[3px]',
  menuList: () => 'thin-scrollbar',
  singleValue: () => '!text-textPrimary select-none',
  multiValue: () => '!text-textPrimary select-none',
  indicatorsContainer: () => '!text-textPrimary',
  dropdownIndicator: () => 'hover:!text-strokeHover !pl-0',
  option: ({ isSelected, isDisabled }) =>
    cx(
      isSelected
        ? isDisabled
          ? '!bg-bgAccentPrimaryAlpha !text-controlsTextDisabled'
          : '!bg-bgAccentPrimaryAlpha !text-textAccentPrimary'
        : isDisabled
        ? '!bg-bgLayer0 !text-controlsTextDisabled'
        : '!bg-bgLayer0 !text-textPrimary hover:!bg-bgAccentPrimaryAlpha'
    ),
};

export const selectStyles: StylesConfig<
  DefaultOptionType,
  boolean,
  GroupBase<DefaultOptionType>
> = {
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};
