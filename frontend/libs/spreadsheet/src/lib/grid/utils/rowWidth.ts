import { Column, ColumnType } from '@deltix/grid-it-core';

export const calculateRowWidth = (cols: Column[], countClones = false) =>
  cols.reduce(
    (acc, { width, type }) =>
      countClones || type !== ColumnType.groupClone ? acc + width : acc,
    0
  );
