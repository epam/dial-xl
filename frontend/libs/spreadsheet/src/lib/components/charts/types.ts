import { MutableRefObject } from 'react';

import { AppTheme, ChartsData, GridChart } from '@frontend/common';

import { Grid } from '../../grid';
import { GridCallbacks } from '../../types';

export type Props = {
  gridCallbacksRef: MutableRefObject<GridCallbacks>;
  api: Grid | null;
  chartData: ChartsData;
  zoom?: number;
  charts?: GridChart[];
  theme: AppTheme;
};

export type ChartConfig = {
  tableName: string;
  top: number;
  left: number;
  width: number;
  height: number;
  toolBarTop: number;
  toolBarLeft: number;
  toolBarHeight: number;
  minResizeWidth: number;
  minResizeHeight: number;

  gridChart: GridChart;
};
