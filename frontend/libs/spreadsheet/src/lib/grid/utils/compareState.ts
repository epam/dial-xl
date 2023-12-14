import { IColumnState } from '@deltix/grid-it-core';

const getOrder = (st: IColumnState) => st?.order ?? Number.MAX_SAFE_INTEGER;

export const compareState = (st1: IColumnState, st2: IColumnState) =>
  getOrder(st1) - getOrder(st2);
