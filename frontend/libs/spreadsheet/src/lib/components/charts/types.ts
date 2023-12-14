import { MutableRefObject } from 'react';

import { ChartData, TableData } from '@frontend/common';

import { Grid, GridChart } from '../../grid';
import { GridCallbacks } from '../../types';

export type Props = {
  gridCallbacksRef: MutableRefObject<GridCallbacks>;
  api: Grid | null;
  chartKeys: TableData;
  chartData: ChartData;
  zoom?: number;
  charts?: GridChart[];
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
};
