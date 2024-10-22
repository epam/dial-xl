import { ColumnType, GridItOptions } from '@deltix/grid-it-core';
import { GridData } from '@frontend/common';

import { defaults } from './defaults';
import { defaultRenderer, tableRenderer } from './utils';

export const options: GridItOptions<GridData> = {
  columns: new Array(defaults.viewport.cols).fill(null).map((_, index) => ({
    id: (index + 1).toString(),
    type: ColumnType.string,
    title: (index + 1).toString(),
    width: defaults.cell.width,
    renderDataCell: ({ width, height, cellData, zoom, index }: any) => {
      if (!cellData) {
        return document.createElement('div');
      }

      if (cellData?.table) {
        return tableRenderer(cellData, width, height, zoom, index);
      }

      return defaultRenderer(cellData, width);
    },
  })),
  getRowHeight: () => defaults.cell.height,
  getMoreData: () => Promise.resolve([]),
};
