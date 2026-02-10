import { MouseEvent } from 'react';

import { ChartConfig } from '../types';

export type ToolBarProps = {
  chartConfig: ChartConfig;
  isMoving: boolean;
  isHidden: boolean;
  isSelected: boolean;
  moveMode: boolean;
  zoom: number;
  onLoadMoreKeys: (tableName: string, fieldName: string) => void;
  onSelectKey: (
    tableName: string,
    fieldName: string,
    key: string | string[],
    isNoDataKey?: boolean,
  ) => void;
  onSelectChart: () => void;
  onStartMoveChart: (e: MouseEvent<HTMLDivElement>) => void;
};

export type ToolBarSelectProps = {
  keyName: string;
  zoom: number;
  chartConfig: ChartConfig;
  onLoadMoreKeys: (tableName: string, fieldName: string) => void;
  onSelectKey: (
    tableName: string,
    fieldName: string,
    key: string | string[],
    isNoDataKey?: boolean,
  ) => void;
};
