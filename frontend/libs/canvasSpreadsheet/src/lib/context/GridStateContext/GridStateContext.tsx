import { Application } from 'pixi.js';
import { createContext } from 'react';
import { BehaviorSubject } from 'rxjs';

import { GridSizes } from '../../constants';
import {
  Edges,
  GetCell,
  GridApi,
  GridTable,
  SelectionEdges,
  SelectionOptions,
  Theme,
} from '../../types';
import { GridEventBus } from '../../utils';

type GridStateContextActions = {
  getCell: GetCell;
  setCellValue: (col: number, row: number, value: string) => void;
  getBitmapFontName: (fontFamily: string) => string;
  setSelectionEdges: (
    edges: SelectionEdges | null,
    selectionOptions?: SelectionOptions,
  ) => void;
  setDottedSelectionEdges: (edges: SelectionEdges | null) => void;
  setPointClickError: (error: boolean) => void;
  setRowNumberWidth: (width: number) => void;
  setIsTableDragging: (isDragging: boolean) => void;
  setDNDSelection: (selection: SelectionEdges | null) => void;
  setHasCharts: (hasCharts: boolean) => void;
  increaseCanvasAnimatedItems: () => void;
  decreaseCanvasAnimatedItems: () => void;
  updateMaxRowOrCol: (
    targetCol: number | null,
    targetRow: number | null,
  ) => void;
  shrinkRowOrCol: (targetCol: number | null, targetRow: number | null) => void;
  setSelectedChart: (chartName: string | null) => void;
};

type GridStateContextValues = {
  app: Application | null;
  canvasSymbolWidth: number;
  gridApi: GridApi;
  eventBus: GridEventBus;
  gridWidth: number;
  gridHeight: number;
  fullHeight: number;
  fullWidth: number;
  gridSizes: GridSizes;
  isTableDragging: boolean;
  pointClickMode: boolean;
  pointClickError: boolean;
  dndSelection: SelectionEdges | null;
  selectedTable: string | null;
  selectedChart: string | null;
  dottedSelectionEdges: SelectionEdges | null;
  tableStructure: GridTable[];
  theme: Theme;
  columnSizes: Record<string, number>;
  isPanModeEnabled: boolean;
  hasCharts: boolean;
  zoom: number;
  selection$: BehaviorSubject<Edges | null>;
  showGridLines: boolean;
};

export const GridStateContext = createContext<
  GridStateContextActions & GridStateContextValues
>({} as GridStateContextActions & GridStateContextValues);
