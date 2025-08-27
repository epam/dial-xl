import * as PIXI from 'pixi.js';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

import {
  AppTheme,
  CellPlacement,
  ChartsData,
  ChartType,
  FieldSortOrder,
  FilesMetadata,
  FormulaBarMode,
  FunctionInfo,
  GPTFocusColumn,
  GPTSuggestion,
  GridCell,
  GridChart,
  GridData,
  GridFilterType,
  GridListFilter,
  GridTable,
  SystemMessageParsedContent,
  TableArrangeType,
  ViewportInteractionMode,
} from '@frontend/common';
import { OverrideValue, ParsedSheets, TotalType } from '@frontend/parser';

import {
  CellEditorExplicitOpenOptions,
  EventType,
  GridCellEditorEvent,
  GridCellEditorEventInsertValue,
  GridCellEditorMode,
  GridContextMenuEvent,
} from './components';
import { GridTooltipEvent } from './components/Tooltip/types';
import { GridSizes } from './constants';
import { FontColorName, FontFamilies } from './setup';

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

  gridViewportSubscription: (
    callback: (deltaX: number, deltaY: number) => void
  ) => () => void;

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
  inputFiles: FilesMetadata[] | null;

  onScroll: GridCallbacks['onScroll'];
  onSelectionChange: GridCallbacks['onSelectionChange'];

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
} & GridCallbacks;

export type GridCallbacks = {
  onSelectionChange?: (selection: SelectionEdges | null) => void;
  onScroll?: (
    startCol: number,
    endCol: number,
    startRow: number,
    endRow: number
  ) => void;

  onDeleteField?: (tableName: string, fieldName: string) => void;
  onDeleteTable?: (tableName: string) => void;
  onAddField?: (
    tableName: string,
    fieldText: string,
    insertOptions?: {
      insertFromFieldName?: string;
      direction?: HorizontalDirection;
      withSelection?: boolean;
    }
  ) => void;
  onSwapFields?: (
    tableName: string,
    fieldName: string,
    direction: HorizontalDirection
  ) => void;
  onIncreaseFieldColumnSize?: (tableName: string, fieldName: string) => void;
  onDecreaseFieldColumnSize?: (tableName: string, fieldName: string) => void;
  onChangeFieldColumnSize?: (
    tableName: string,
    fieldName: string,
    valueAdd: number
  ) => void;
  onMoveTable?: (tableName: string, rowDelta: number, colDelta: number) => void;
  onCloneTable?: (tableName: string) => void;
  onToggleTableTitleOrHeaderVisibility?: (
    tableName: string,
    toggleTableHeader: boolean
  ) => void;
  onFlipTable?: (tableName: string) => void;
  onDNDTable?: (tableName: string, row: number, col: number) => void;
  onChangeFieldDimension?: (
    tableName: string,
    fieldName: string,
    isRemove?: boolean
  ) => void;
  onChangeFieldKey?: (
    tableName: string,
    fieldName: string,
    isRemove?: boolean
  ) => void;
  onChangeFieldIndex?: (
    tableName: string,
    fieldName: string,
    isRemove?: boolean
  ) => void;
  onChangeDescription?: (
    tableName: string,
    fieldName: string,
    descriptionFieldName: string,
    isRemove?: boolean
  ) => void;
  onCreateDerivedTable?: (tableName: string) => void;
  onCreateManualTable?: (
    col: number,
    row: number,
    cells: string[][],
    hideTableHeader?: boolean,
    hideFieldHeader?: boolean,
    customTableName?: string
  ) => void;
  onCellEditorSubmit?: ({
    editMode,
    currentCell,
    cell,
    value,
    dimFieldName,
    openStatusModal,
  }: {
    editMode: GridCellEditorMode;
    currentCell: CellPlacement;
    cell: GridCell | undefined;
    value: string;
    dimFieldName?: string;
    openStatusModal?: (text: string) => void;
  }) => void;
  onRemoveOverride?: (
    tableName: string,
    fieldName: string,
    overrideIndex: number,
    value: OverrideValue
  ) => void;
  onRemoveOverrideRow?: (tableName: string, overrideIndex: number) => void;
  onCellEditorUpdateValue?: (
    value: string,
    cancelEdit: boolean,
    dimFieldName?: string
  ) => void;
  onMessage?: (message: string) => void;
  onExpandDimTable?: (
    tableName: string,
    fieldName: string,
    col: number,
    row: number
  ) => void;
  onShowRowReference?: (
    tableName: string,
    fieldName: string,
    col: number,
    row: number
  ) => void;
  onChartResize?: (tableName: string, cols: number, rows: number) => void;
  onGetMoreChartKeys?: (tableName: string, fieldName: string) => void;
  onSelectChartKey?: (
    tableName: string,
    fieldName: string,
    key: string | string[],
    isNoDataKey?: boolean
  ) => void;
  onAddChart?: (tableName: string, chartType: ChartType) => void;
  onConvertToTable?: (tableName: string) => void;
  onConvertToChart?: (tableName: string, chartType: ChartType) => void;
  onPaste?: (cells: string[][]) => void;
  onRemoveNote?: (tableName: string, fieldName?: string) => void;
  onUpdateNote?: ({
    tableName,
    fieldName,
    note,
  }: {
    tableName: string;
    fieldName?: string | undefined;
    note: string;
  }) => void;
  onCellEditorChangeEditMode?: (editMode: GridCellEditorMode) => void;
  onAddTableRow?: (
    col: number,
    row: number,
    tableName: string,
    value: string
  ) => void;
  onAddTableRowToEnd?: (tableName: string, value: string) => void;
  onStartPointClick?: () => void;
  onStopPointClick?: () => void;
  onPointClickSelectValue?: (
    pointClickSelection: SelectionEdges | null
  ) => void;
  onOpenInEditor?: (
    tableName: string,
    fieldName?: string,
    openOverride?: boolean
  ) => void;
  onDelete?: () => void;
  onSortChange?: (
    tableName: string,
    fieldName: string,
    order: FieldSortOrder
  ) => void;
  onApplyConditionFilter?: (
    tableName: string,
    fieldName: string,
    operator: string,
    value: string | string[] | null,
    filterType: GridFilterType
  ) => void;
  onApplyListFilter?: (
    tableName: string,
    fieldName: string,
    values: string[],
    isNumeric: boolean
  ) => void;
  onRemoveTotalByIndex?: (
    tableName: string,
    fieldName: string,
    index: number
  ) => void;
  onToggleTotalByType?: (
    tableName: string,
    fieldName: string,
    type: TotalType
  ) => void;
  onUpdateFieldFilterList?: (args: {
    tableName: string;
    fieldName: string;
    getMoreValues?: boolean;
    searchValue: string;
    sort: 1 | -1;
  }) => void;
  onPromoteRow?: (tableName: string, dataIndex: number) => void;
  onCreateTableAction?: (
    action: string,
    type: string | undefined,
    insertFormula: string | undefined,
    tableName: string | undefined
  ) => void;
  onAutoFitFields?: (tableName: string) => void;
  onRemoveFieldSizes?: (tableName: string) => void;
  onApplySuggestion?: (
    GPTSuggestions: GPTSuggestion[] | null,
    GPTFocusColumn: GPTFocusColumn[]
  ) => void;
  onUndo?: () => void;
  onOpenSheet?: (args: { sheetName: string }) => void;
  onArrangeTable?: (tableName: string, arrangeType: TableArrangeType) => void;
  onAddAllFieldTotals?: (tableName: string, fieldName: string) => void;
  onAddAllTableTotals?: (tableName: string) => void;
  onInsertChart?: (chartType: ChartType) => void;
  onSelectTableForChart?: (tableName: string, chartTableName: string) => void;
  onChartDblClick?: () => void;
  onDownloadTable?: (tableName: string) => Promise<void>;
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

export type IconMetadata = {
  path: string;
  iconSize: number;
  tableName?: string;
  tooltip?: string;
};

export type IconCell = {
  icon?: PIXI.Sprite;
  secondaryIcon?: PIXI.Sprite; // e.g. for the table header context menu
  iconMetadata?: IconMetadata;
  secondaryIconMetadata?: IconMetadata;
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
