import { ChartConfig } from '../types';

export type ToolBarProps = {
  chartConfig: ChartConfig;
  isHidden: boolean;
  moveMode: boolean;
  zoom: number;
  onLoadMoreKeys: (tableName: string, fieldName: string) => void;
  onSelectKey: (tableName: string, fieldName: string, key: string) => void;
};

export type ToolBarSelectProps = {
  keyName: string;
  zoom: number;
  chartConfig: ChartConfig;
  onLoadMoreKeys: (tableName: string, fieldName: string) => void;
  onSelectKey: (tableName: string, fieldName: string, key: string) => void;
};
