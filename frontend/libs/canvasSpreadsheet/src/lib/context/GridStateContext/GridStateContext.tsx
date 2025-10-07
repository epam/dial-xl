import { createContext } from 'react';
import { BehaviorSubject } from 'rxjs';

import { Application } from '@pixi/app';

import { GridSizes } from '../../constants';
import {
  Edges,
  GetCell,
  GridApi,
  GridCallbacks,
  GridTable,
  SelectionEdges,
  SelectionOptions,
  Theme,
} from '../../types';

type GridStateContextActions = {
  getCell: GetCell;
  setCellValue: (col: number, row: number, value: string) => void;
  getBitmapFontName: (fontFamily: string, fontName: string) => string;
  setSelectionEdges: (
    edges: SelectionEdges | null,
    selectionOptions?: SelectionOptions
  ) => void;
  setDottedSelectionEdges: (edges: SelectionEdges | null) => void;
  setPointClickError: (error: boolean) => void;
  setRowNumberWidth: (width: number) => void;
  setIsTableDragging: (isDragging: boolean) => void;
  setDNDSelection: (selection: SelectionEdges | null) => void;
  setHasCharts: (hasCharts: boolean) => void;
  selection$: BehaviorSubject<Edges | null>;
};

type GridStateContextValues = {
  app: Application | null;
  gridApi: GridApi;
  gridCallbacks: GridCallbacks;
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
  dottedSelectionEdges: SelectionEdges | null;
  tableStructure: GridTable[];
  theme: Theme;
  columnSizes: Record<string, number>;
  isPanModeEnabled: boolean;
  hasCharts: boolean;
  zoom: number;
  updateMaxRowOrCol: (
    targetCol: number | null,
    targetRow: number | null
  ) => void;
  shrinkRowOrCol: (targetCol: number | null, targetRow: number | null) => void;
};

export const GridStateContext = createContext<
  GridStateContextActions & GridStateContextValues
>({} as GridStateContextActions & GridStateContextValues);
