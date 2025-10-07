import { createContext, MutableRefObject } from 'react';

import { CellPlacement } from '@frontend/common';

import { GetCellX, GetCellY, ViewportCoords, ViewportEdges } from '../../types';
import { GridViewportSubscriber } from '../GridViewportSubscriber';

type GridViewportContextActions = {
  getCellX: GetCellX;
  getCellY: GetCellY;
  getCellFromCoords: (x: number, y: number) => CellPlacement;
  moveViewport: (x: number, y: number, skipMaxCheck?: boolean) => void;

  gridViewportSubscriber: MutableRefObject<GridViewportSubscriber>;
};

type GridViewportContextValues = {
  viewportEdges: MutableRefObject<ViewportEdges>;
  viewportCoords: MutableRefObject<ViewportCoords>;
  viewportColCount: number;
  viewportRowCount: number;
};

export const GridViewportContext = createContext<
  GridViewportContextActions & GridViewportContextValues
>({} as GridViewportContextActions & GridViewportContextValues);
