import { AppTheme, ChartsData, GridChart } from '@frontend/common';

import { GridTable } from '../../types';
import { GridEventBus } from '../../utils';

export type Props = {
  eventBus: GridEventBus;
  chartData: ChartsData;
  charts?: GridChart[];
  theme: AppTheme;
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
