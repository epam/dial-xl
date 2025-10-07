import cx from 'classnames';
import { DefaultOptionType } from 'rc-select/lib/Select';
import { GroupBase, StylesConfig } from 'react-select';

import { selectStyles } from '@frontend/common';

import { getPx } from '../../../utils';
import { ChartConfig } from '../types';

export const selectHeight = 24;
export const defaultFontSize = 12;

type Props = {
  height: number;
  width: number;
  zoom: number;
};

export function getSelectStyles({
  height,
  width,
  zoom,
}: Props): StylesConfig<
  DefaultOptionType,
  boolean,
  GroupBase<DefaultOptionType>
> {
  return {
    ...selectStyles,
    control: (base) => ({
      ...base,
      boxShadow: 'none',
      fontSize: getPx(defaultFontSize * zoom),
      minHeight: getPx(height * zoom),
      height: getPx(height * zoom),
      width: getPx(width * zoom),
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '0 0 0 4px',
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? '#dbeafe'
        : state.isFocused
        ? '#dde4ee'
        : 'transparent',
      color: '#000',
      fontSize: getPx(defaultFontSize * zoom),
      padding: '4px 8px',
    }),
    dropdownIndicator: (base) => ({
      ...base,
      padding: '0 8px',
    }),
  };
}

export function getSingleSelectOptionStyles(
  isSelected: boolean,
  data: DefaultOptionType,
  keyName: string,
  chartConfig: ChartConfig
): string {
  const noDataKeys = chartConfig.gridChart.keysWithNoDataPoint[keyName] || [];
  const isNoDataKey = noDataKeys.includes(data.value as string);

  if (isNoDataKey) {
    return cx(
      isSelected
        ? 'bg-bg-accent-primary-alpha! text-text-secondary!'
        : 'bg-bg-layer-0! text-text-secondary! hover:bg-bg-accent-primary-alpha!'
    );
  }

  return cx(
    isSelected
      ? 'bg-bg-accent-primary-alpha! text-text-accent-primary!'
      : 'bg-bg-layer-0! text-text-primary! hover:bg-bg-accent-primary-alpha!'
  );
}
