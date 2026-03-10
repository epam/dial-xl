import { Tooltip } from 'antd';
import cx from 'classnames';
import { MouseEvent } from 'react';

import Icon from '@ant-design/icons';
import { CloseIcon, DotsIcon } from '@frontend/common';

import { getPx } from '../../../utils';
import { ChartConfig } from '../types';

type Props = {
  visible: boolean;
  chartConfig: ChartConfig;
  onOpenContextMenu: (e: MouseEvent<any>, chartConfig: ChartConfig) => void;
  onDeleteChart: () => void;
};

export function ChartActions({
  visible,
  chartConfig,
  onOpenContextMenu,
  onDeleteChart,
}: Props) {
  return (
    <div
      className={cx(
        'absolute pointer-events-auto flex items-center justify-center gap-2 transition-opacity duration-200 ease-in-out',
        visible
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none',
      )}
      style={{
        top: getPx(chartConfig.top + 10),
        left: getPx(chartConfig.left + chartConfig.width - 50),
      }}
    >
      <Tooltip title="Context menu">
        <Icon
          className="w-4 text-text-secondary cursor-pointer"
          component={() => <DotsIcon />}
          onClick={(e) => {
            onOpenContextMenu?.(e, chartConfig);
          }}
        />
      </Tooltip>
      <Tooltip title="Delete chart">
        <Icon
          className="w-4 text-text-secondary cursor-pointer"
          component={() => <CloseIcon />}
          onClick={() => {
            onDeleteChart?.();
          }}
        />
      </Tooltip>
    </div>
  );
}
