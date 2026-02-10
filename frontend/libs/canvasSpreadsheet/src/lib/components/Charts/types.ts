import { AppTheme, ChartsData, GridChart } from '@frontend/common';

import { GridApi, GridTable } from '../../types';
import { GridEventBus } from '../../utils';

export type Props = {
  eventBus: GridEventBus;
  api: GridApi | null;
  chartData: ChartsData;
  zoom?: number;
  charts?: GridChart[];
  theme: AppTheme;
  columnSizes: Record<number, number>;
  tableStructure: GridTable[];
};

export type ChartConfig = {
  tableName: string;
  top: number;
  left: number;
  width: number;
  height: number;
  titleHeight: number;
  titleTop: number;
  titleLeft: number;
  toolBarTop: number;
  toolBarLeft: number;
  toolBarHeight: number;
  minResizeWidth: number;
  minResizeHeight: number;
  showToolbar: boolean;
  showTitle: boolean;
  gridChart: GridChart;
};
