import { MutableRefObject } from 'react';

import { AppTheme, ChartsData, GridChart } from '@frontend/common';
import { ParsedSheets } from '@frontend/parser';

import { GridApi, GridCallbacks, GridTable } from '../../types';

export type Props = {
  gridCallbacksRef: MutableRefObject<GridCallbacks>;
  api: GridApi | null;
  chartData: ChartsData;
  zoom?: number;
  charts?: GridChart[];
  theme: AppTheme;
  columnSizes: Record<number, number>;
  tableStructure: GridTable[];
  parsedSheets: ParsedSheets;
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
  showToolbar: boolean;
  gridChart: GridChart;
};
