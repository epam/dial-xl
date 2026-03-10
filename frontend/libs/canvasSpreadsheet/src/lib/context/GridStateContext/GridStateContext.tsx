import { Application } from 'pixi.js';
import { createContext, RefObject } from 'react';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

import { GridCellEditorEvent, GridContextMenuEvent } from '../../components';
import { GridTooltipEvent } from '../../components/Tooltip/types';
import { GridSizes } from '../../constants';
import { CanvasOptions, EventType } from '../../types';
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
  hideDottedSelection: () => void;
  showDottedSelection: (selection: SelectionEdges) => void;
  openContextMenuAtCoords: GridApi['openContextMenuAtCoords'];
  openTooltip: (x: number, y: number, content: string) => void;
  closeTooltip: () => void;
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
  selectionEdges: Edges | null;
  selectionEdgesRef: RefObject<Edges | null>;
  showGridLines: boolean;
  events$: Observable<EventType>;
  event: { emit: (event: EventType) => void };
  cellEditorEvent$: RefObject<Subject<GridCellEditorEvent>>;
  tooltipEvent$: RefObject<Subject<GridTooltipEvent>>;
  contextMenuEvent$: RefObject<Subject<GridContextMenuEvent>>;
  canvasOptions: CanvasOptions;
  canvasId: string;
};

export const GridStateContext = createContext<
  GridStateContextActions & GridStateContextValues
>({} as GridStateContextActions & GridStateContextValues);
