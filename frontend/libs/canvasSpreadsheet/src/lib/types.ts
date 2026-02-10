import * as PIXI from 'pixi.js';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

import {
  AppTheme,
  CellPlacement,
  ChartsData,
  ChartType,
  ColumnDataType,
  ColumnFormat,
  ControlData,
  FieldSortOrder,
  FormulaBarMode,
  FunctionInfo,
  GridChart,
  GridListFilter,
  ResourceMetadata,
  SharedWithMeMetadata,
  SystemMessageParsedContent,
  ViewportInteractionMode,
} from '@frontend/common';
import {
  ControlType,
  OverrideValue,
  ParsedConditionFilter,
  ParsedSheets,
  TotalType,
} from '@frontend/parser';

import {
  CellEditorExplicitOpenOptions,
  EventType,
  GridCellEditorEvent,
  GridCellEditorEventInsertValue,
  GridContextMenuEvent,
} from './components';
import { GridTooltipEvent } from './components/Tooltip/types';
import { GridSizes } from './constants';
import { FontColorName, FontFamilies } from './setup';
import { GridEventBus } from './utils';

export type GridApi = {
  getViewportCoords: () => ViewportCoords;
  getViewportEdges: () => ViewportEdges;
  moveViewport: (x: number, y: number) => void;
  moveViewportToCell: (
    col: number,
    row: number,
    centerCellInViewport?: boolean
  ) => void;

  updateSelection: (
    selection: SelectionEdges | null,
    selectionOptions?: SelectionOptions
  ) => void;
  clearSelection: () => void;
  selectedTable: string | null;

  getCell: GetCell;
  getCellFromCoords: (x: number, y: number) => CellPlacement;
  getCellX: GetCellX;
  getCellY: GetCellY;
  gridSizes: GridSizes;
  getCanvasSymbolWidth: () => number;
  getColumnContentMaxSymbols: (
    col: number,
    viewportStartRow: number,
    viewportEndRow: number
  ) => number;

  setCellValue: (col: number, row: number, value: string) => void;

  gridViewportSubscription: (callback: () => void) => () => void;

  tooltipEvent$: Subject<GridTooltipEvent>;
  openTooltip: (x: number, y: number, message: string) => void;
  closeTooltip: () => void;

  contextMenuEvent$: Subject<GridContextMenuEvent>;
  openContextMenuAtCoords: (
    x: number,
    y: number,
    col: number,
    row: number,
    source?: 'canvas-element' | 'html-element'
  ) => void;

  cellEditorEvent$: Subject<GridCellEditorEvent>;
  isCellEditorOpen: () => boolean;
  isCellEditorFocused: () => boolean;
  hideCellEditor: () => void;
  setCellEditorValue: (value: string) => void;
  insertCellEditorValue: (
    value: string,
    options?: GridCellEditorEventInsertValue['options']
  ) => void;
  showCellEditor: (
    col: number,
    row: number,
    value: string,
    options?: CellEditorExplicitOpenOptions
  ) => void;

  setPointClickValue: (value: string) => void;
  setPointClickError: (error: boolean) => void;

  hideDottedSelection: () => void;
  showDottedSelection: (selection: SelectionEdges) => void;

  dndSelection: SelectionEdges | null;
  setDNDSelection: (selection: SelectionEdges | null) => void;

  arrowNavigation: (key: string) => void;
  tabNavigation: () => void;

  isPanModeEnabled: boolean;

  hasCharts: boolean;
  setHasCharts: (hasCharts: boolean) => void;

  events$: Observable<EventType>;

  event: any;
  updateSelectionAfterDataChanged: (selection: SelectionEdges) => void;

  selection$: BehaviorSubject<Edges | null>;
};

export type GetCellX = (col: number) => number;
export type GetCellY = (row: number) => number;
export type GetCell = (col: number, row: number) => GridCell | undefined;

export type GridProps = {
  data: GridData;
  chartData: ChartsData;
  filterList: GridListFilter[];
  tableStructure: GridTable[];
  columnSizes: Record<string, number>;
  inputFiles: (ResourceMetadata | SharedWithMeMetadata)[] | null;
  controlData: ControlData | null;
  controlIsLoading: boolean;

  isReadOnly: boolean;
  zoom?: number;
  functions: FunctionInfo[];
  parsedSheets: ParsedSheets;
  charts?: GridChart[];
  theme: AppTheme;
  formulaBarMode: FormulaBarMode;
  isPointClickMode: boolean;
  sheetContent: string;
  systemMessageContent: SystemMessageParsedContent | undefined;
  currentSheetName: string | null;
  viewportInteractionMode: ViewportInteractionMode;

  eventBus: GridEventBus;
};

export type Color = number | string;

export type Theme = {
  themeName: AppTheme;
  grid: { lineColor: Color; bgColor: Color };
  cell: {
    borderColor: Color;
    bgColor: Color;
    bgEvenColor: Color;
    tableHeaderBgColor: Color;
    fieldHeaderBgColor: Color;
    totalBgColor: Color;
    cellFontColorName: FontColorName;
    cellFontFamily: FontFamilies;
    boldCellFontFamily: FontFamilies;
    boldCellFontColorName: FontColorName;
    keyFontFamily: FontFamilies;
    keyFontColorName: FontColorName;
    linkFontColorName: FontColorName;
    linkFontFamily: FontFamilies;
    indexFontColorName: FontColorName;
    resizerHoverColor: Color;
    resizerActiveColor: Color;
  };
  colNumber: {
    borderColor: Color;
    bgColor: Color;
    bgColorSelected: Color;
    bgColorFullSelected: Color;
    bgColorHover: Color;
    fontColorName: FontColorName;
    fontFamily: FontFamilies;
    resizerHoverColor: Color;
    resizerActiveColor: Color;
  };
  rowNumber: {
    bgColor: Color;
    bgColorSelected: Color;
    bgColorFullSelected: Color;
    bgColorHover: Color;
    fontColorName: FontColorName;
    fontFamily: FontFamilies;
  };
  scrollBar: {
    trackColor: Color;
    trackStrokeColor: Color;
    thumbColor: Color;
    thumbColorHovered: Color;
  };
  selection: { bgColor: Color; bgAlpha: number; borderColor: Color };
  pointClickSelection: {
    color: Color;
    errorColor: Color;
    alpha: 1;
    alignment: 0;
  };
  dottedSelection: {
    color: Color;
    alpha: number;
    alignment: number;
    rectangleAlpha: number;
  };
  override: { borderColor: Color };
  error: { borderColor: Color };
  noteLabel: { bgColor: Color };
  highlight: {
    dimmed: {
      bgColor: Color;
      negativeAlpha: number;
      alpha: number;
      textAlpha: number;
    };
    highlighted: {
      bgColor: Color;
      alpha: number;
      negativeAlpha: number;
      textAlpha: number;
    };
  };
  dndSelection: { borderColor: Color };
  hiddenCell: { fontColorName: FontColorName; fontFamily: FontFamilies };
  tableShadow: {
    color: Color;
    alpha: number;
    rectangleAlpha: number;
  };
};

export type Coordinates = {
  x: number;
  y: number;
};

export type Edges = {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
};

export type ViewportEdges = Edges;
export type SelectionEdges = Edges;

export type ViewportCoords = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type Cell = {
  col: number;
  row: number;
  text: PIXI.BitmapText;
};

type CellFnArgs = {
  cellData: GridCell;
  eventBus: GridEventBus;
  gridApi: GridApi;
  themeName: AppTheme;
  gridSizes: GridSizes;
};

export type CellIconConfig = {
  name: string;
  priority: number; // lower value has higher priority, same priority items rendered near each other
  enabled: (args: CellFnArgs) => boolean; // if false, icon will not be added to the cell
  visibleModifier: 'hoverField' | 'hoverTable' | 'always'; // if 'hover', icon will be visible only when cell is hovered
  path: (args: CellFnArgs) => string | string[];
  tooltip: ((args: CellFnArgs) => string) | string | undefined;
  iconSize: (args: CellFnArgs) => number;
  onAddEventListeners?: (args: CellFnArgs & { icon: PIXI.Sprite }) => void;
};

export type IconMetadata = {
  path: string | string[];
  isAnimatedIcon: boolean;
  iconSize: number;
  visibleModifier: 'hoverField' | 'hoverTable' | 'always';
  tableName?: string;
  tooltip?: string;
  onAddEventListeners?: (args: CellFnArgs & { icon: PIXI.Sprite }) => void;
};

export type CellIcon = {
  icon: PIXI.Sprite;
  metadata: IconMetadata;
};

export type CellIcons = {
  primaryIcons: CellIcon[]; // left icons
  secondaryIcons: CellIcon[]; // right icons
};

export type CellStyle = {
  bgColor?: Color;
  highlight?: {
    color: Color;
    alpha: number;
    textAlpha: number;
  };
  border?: {
    borderTop?: PIXI.ILineStyleOptions;
    borderRight?: PIXI.ILineStyleOptions;
    borderBottom?: PIXI.ILineStyleOptions;
    borderLeft?: PIXI.ILineStyleOptions;
  };
  shadow?: {
    shadowTop?: PIXI.ILineStyleOptions[];
    shadowTopRight?: PIXI.ILineStyleOptions[];
    shadowTopLeft?: PIXI.ILineStyleOptions[];
    shadowRight?: PIXI.ILineStyleOptions[];
    shadowBottom?: PIXI.ILineStyleOptions[];
    shadowBottomRight?: PIXI.ILineStyleOptions[];
    shadowBottomLeft?: PIXI.ILineStyleOptions[];
    shadowLeft?: PIXI.ILineStyleOptions[];
  };
};

export type ScrollBarDirection = 'horizontal' | 'vertical';

export type Rectangle = Coordinates & { width: number; height: number };
export type Line = { x1: number; y1: number; x2: number; y2: number };

export type DocumentScrollOptions = {
  top: number;
  bottom: number;
  left: number;
  right: number;
  pageX: number;
  pageY: number;
};

export type HorizontalDirection = 'left' | 'right';
export type VerticalDirection = 'up' | 'down';

export type SelectionOptions = {
  selectedTable?: string;
  silent?: boolean;
};

export type GridTable = {
  startRow: number;
  startCol: number;
  endCol: number;
  endRow: number;
  tableName: string;
  chartType?: ChartType;
  isTableNameHeaderHidden: boolean;
  isTableFieldsHeaderHidden: boolean;
  isTableHorizontal: boolean;
  totalSize: number;
  hasKeys: boolean;
  isManual: boolean;
  highlightType?: 'DIMMED' | 'NORMAL' | 'HIGHLIGHTED' | undefined;
  note: string;
  fieldNames: string[];
};

export type GridField = {
  fieldName: string;
  expression: string;
  isKey: boolean;
  isDim: boolean;
  isNested: boolean;
  isPeriodSeries: boolean;
  isDynamic: boolean;
  isFiltered: boolean;
  filter?: ParsedConditionFilter;
  totalFieldTypes?: TotalType[];
  sort: FieldSortOrder;
  isFieldUsedInSort: boolean;
  type: ColumnDataType;
  format: ColumnFormat | undefined;
  referenceTableName?: string;
  note?: string;
  hasError: boolean;
  errorMessage?: string;
  highlightType?: 'DIMMED' | 'NORMAL' | 'HIGHLIGHTED' | undefined;
  isInput: boolean;
  isImport: boolean;
  isIndex: boolean;
  isControl: boolean;
  controlType?: ControlType;
  isDescription: boolean;
  descriptionField?: string;
  dataLength: number;
  hasOverrides: boolean;
  isAIFunctions: boolean;
  isLoading?: boolean;
};

export type GridCell = {
  table?: GridTable;
  field?: GridField;
  value?: string;
  displayValue?: string;

  hasError?: boolean;
  errorMessage?: string;

  totalIndex?: number;
  totalType?: TotalType;
  totalExpression?: string;

  row: number;
  col: number;
  dataIndex?: number;

  overrideIndex?: number;
  overrideValue?: OverrideValue;
  isOverride?: boolean;
  overrideAIFunctions?: boolean;

  isUrl?: boolean;

  isTableHeader?: boolean;
  isFieldHeader?: boolean;

  isRightAligned?: boolean;

  startCol: number;
  endCol: number;

  startGroupColOrRow: number;
  endGroupColOrRow: number;
};

export type RowData = { [col: string]: GridCell };

export type GridData = {
  [row: string]: RowData;
};
