import cx from 'classnames';
import { DefaultOptionType } from 'rc-select/lib/Select';
import { ClassNamesConfig, GroupBase } from 'react-select';

export const inputClasses =
  'rounded-[3px] border !border-strokeTertiary bg-bgLayer3 text-textPrimary focus:!bg-bgLayer3 focus-within:!bg-bgLayer3 focus-within:!shadow-none focus:!shadow-none focus-within:!border-strokeAccentPrimary focus:!border-strokeAccentPrimary hover:!bg-bgLayer3 hover:!border-strokeAccentPrimary';

export const primaryButtonClasses =
  'border-controlsBgAccent rounded-[3px] !bg-controlsBgAccent !text-controlsTextPermanent !shadow-none focus:!outline-0 focus-visible:!outline-0 focus:!border focus:!border-strokeHoverFocus focus:!bg-controlsBgAccentHover hover:!border-controlsBgAccentHover hover:!bg-controlsBgAccentHover hover:!text-controlsTextPermanent';

export const primaryDisabledButtonClasses =
  'disabled:text-controlsTextDisable disabled:!bg-controlsBgDisable';

export const secondaryButtonClasses =
  'border-strokePrimary rounded-[3px] !text-textPrimary !bg-bgLayer2 !shadow-none hover:!border-bgLayer4 hover:!bg-bgLayer4 hover:!text-textPrimary focus:!outline-0 focus-visible:!outline-0 focus:!border focus:!border-strokeHoverFocus focus:!bg-bgLayer4';

export const secondaryOutlineButtonClasses =
  'border-strokePrimary rounded-[3px] !text-textPrimary !bg-transparent !shadow-none hover:!border-bgLayer4 hover:!bg-bgLayer4 hover:!text-textPrimary focus:!outline-0 focus-visible:!outline-0 focus:!border focus:!border-strokeHoverFocus focus:!bg-bgLayer4';

export const secondaryOutlineInvertedButtonClasses =
  'border-strokePrimary rounded-[3px] !text-textInverted !bg-transparent !shadow-none hover:!border-bgLayer4 hover:!bg-bgLayer4 hover:!text-textPrimary focus:!text-textPrimary focus:!outline-0 focus-visible:!outline-0 focus:!border focus:!border-strokeHoverFocus focus:!bg-bgLayer4';

export const secondaryDisabledButtonClasses =
  'disabled:!border-0 disabled:!text-controlsTextDisable disabled:!bg-controlsBgDisable';

export const modalFooterButtonClasses = 'h-9 text-[13px]';

export const selectedTabClasses =
  'bg-bgAccentPrimaryAlpha border-b-2 !border-b-strokeAccentPrimary hover:!bg-bgAccentPrimaryAlpha focus:!bg-bgAccentPrimaryAlpha focus:!border-b-strokeAccentPrimary focus-visible:!bg-strokeAccentPrimary';

export const notSelectedTabClasses =
  'bg-bgLayer4 hover:!bg-bgAccentPrimaryAlpha focus:!bg-bgAccentPrimaryAlpha focus-visible:!bg-bgAccentPrimaryAlpha';

export const defaultTabClasses =
  'flex items-center rounded-[3px] !text-textPrimary border-0 shadow-none focus:!outline-0 focus-visible:!outline-0 !transition-none';

export const iconClasses =
  'stroke-textSecondary text-textSecondary cursor-pointer hover:stroke-textAccentPrimary hover:text-textAccentPrimary';

export const SelectClasses: ClassNamesConfig<
  DefaultOptionType,
  false,
  GroupBase<any>
> = {
  control: ({ menuIsOpen }) =>
    cx(
      '!bg-bgLayer3 hover:!border-strokeAccentPrimary !shadow-none text-[13px]',
      menuIsOpen ? '!border-strokeAccentPrimary' : '!border-strokeTertiary'
    ),
  menu: () => '!bg-bgLayer0 text-[13px] !rounded-[3px]',
  singleValue: () => '!text-textPrimary',
  indicatorsContainer: () => '!text-textPrimary',
  dropdownIndicator: () => 'hover:!text-strokeHover !pl-0',
  option: ({ isSelected }) =>
    cx(
      isSelected
        ? '!bg-bgAccentPrimaryAlpha !text-textAccentPrimary'
        : '!bg-bgLayer0 !text-textPrimary hover:!bg-bgAccentPrimaryAlpha'
    ),
};
