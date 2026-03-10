import { createContext, RefObject } from 'react';

import { CellPlacement } from '@frontend/common';

import { GetCellX, GetCellY, ViewportCoords, ViewportEdges } from '../../types';
import { GridViewportSubscriber } from '../GridViewportSubscriber';

type GridViewportContextActions = {
  getCellX: GetCellX;
  getCellY: GetCellY;
  getCellFromCoords: (x: number, y: number) => CellPlacement;
  moveViewport: (x: number, y: number, skipMaxCheck?: boolean) => void;

  gridViewportSubscriber: RefObject<GridViewportSubscriber>;
};

type GridViewportContextValues = {
  viewportEdges: RefObject<ViewportEdges>;
  viewportCoords: RefObject<ViewportCoords>;
  viewportColCount: number;
  viewportRowCount: number;
};

export const GridViewportContext = createContext<
  GridViewportContextActions & GridViewportContextValues
>({} as GridViewportContextActions & GridViewportContextValues);
