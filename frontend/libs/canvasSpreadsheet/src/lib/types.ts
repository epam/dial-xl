import * as PIXI from 'pixi.js';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

import {
  AppTheme,
  CellPlacement,
  ChartsData,
  FieldSortOrder,
  FilesMetadata,
  FormulaBarMode,
  FunctionInfo,
  GPTSuggestion,
  GridCell,
  GridChart,
  GridData,
  GridListFilter,
  GridTable,
  SystemMessageParsedContent,
  TableArrangeType,
} from '@frontend/common';
import { OverrideValue, ParsedSheets, TotalType } from '@frontend/parser';

import {
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
  moveViewportToCell: (col: number, row: number) => void;

  getSelection: () => SelectionEdges | null;
  updateSelection: (
    selection: SelectionEdges | null,
    selectionOptions?: SelectionOptions
  ) => void;
  clearSelection: () => void;

  getCell: GetCell;
  getCellFromCoords: (x: number, y: number) => CellPlacement;
  getCellX: GetCellX;
  getCellY: GetCellY;
  getGridSizes: () => GridSizes;
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
    row: number
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
    options?: {
      dimFieldName?: string;
      withFocus?: boolean;
    }
  ) => void;

  setPointClickValue: (value: string) => void;
  setPointClickError: (error: boolean) => void;

  hideDottedSelection: () => void;
  showDottedSelection: (selection: SelectionEdges) => void;

  setDNDSelection: (selection: SelectionEdges | null) => void;

  arrowNavigation: (key: string) => void;
  tabNavigation: () => void;

  events$: Observable<EventType>;

  event: any;
  selection: SelectionEdges | null;
  updateSelectionAfterDataChanged: (selection: SelectionEdges) => void;

  selection$: BehaviorSubject<Edges | null>;
};

export type GetCellX = (col: number) => number;
export type GetCellY = (row: number) => number;
export type GetCell = (col: number, row: number) => GridCell | undefined;

export type GridProps = {
  data: GridData;
  chartData: ChartsData;
  tableStructure: GridTable[];
  columnSizes: Record<string, number>;
  inputFiles: FilesMetadata[] | null;

  onScroll: GridCallbacks['onScroll'];
  onSelectionChange: GridCallbacks['onSelectionChange'];

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
} & GridCallbacks;

export type GridCallbacks = {
  onSelectionChange?: (selection: SelectionEdges | null) => void;
  onScroll?: (
    startCol: number,
    endCol: number,
    startRow: number,
    endRow: number
  ) => void;
  onRenameTable?: (oldName: string, newName: string) => void;
  onRenameField?: (tableName: string, oldName: string, newName: string) => void;
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
    rightFieldName: string,
    leftFieldName: string,
    direction: HorizontalDirection
  ) => void;
  onIncreaseFieldColumnSize?: (tableName: string, fieldName: string) => void;
  onDecreaseFieldColumnSize?: (tableName: string, fieldName: string) => void;
  onChangeFieldColumnSize?: (
    tableName: string,
    fieldName: string,
    valueAdd: number
  ) => void;
  onEditExpression?: (
    tableName: string,
    fieldName: string,
    expression: string
  ) => void;
  onEditExpressionWithOverrideRemove?: (
    tableName: string,
    fieldName: string,
    expression: string,
    overrideIndex: number,
    overrideValue: OverrideValue
  ) => void;
  onMoveTable?: (tableName: string, rowDelta: number, colDelta: number) => void;
  onCloneTable?: (tableName: string) => void;
  onToggleTableHeaderVisibility?: (tableName: string) => void;
  onToggleTableFieldsVisibility?: (tableName: string) => void;
  onFlipTable?: (tableName: string) => void;
  onDNDTable?: (tableName: string, row: number, col: number) => void;
  onRemoveDimension?: (tableName: string, fieldName: string) => void;
  onAddKey?: (tableName: string, fieldName: string) => void;
  onRemoveKey?: (tableName: string, fieldName: string) => void;
  onCloseTable?: (tableName: string) => void;
  onAddDimension?: (tableName: string, fieldName: string) => void;
  onCreateDerivedTable?: (tableName: string) => void;
  onCreateManualTable?: (
    col: number,
    row: number,
    cells: string[][],
    hideTableHeader?: boolean,
    hideFieldHeader?: boolean,
    customTableName?: string
  ) => void;
  onCellEditorSubmit?: (
    col: number,
    overrideIndex: number,
    value: string
  ) => void;
  onRemoveOverride?: (
    tableName: string,
    fieldName: string,
    overrideIndex: number,
    value: OverrideValue
  ) => void;
  onRemoveOverrideRow?: (tableName: string, overrideIndex: number) => void;
  onAddOverride?: (
    col: number,
    row: number,
    tableName: string,
    value: string
  ) => void;
  onEditOverride?: (
    tableName: string,
    fieldName: string,
    overrideIndex: number,
    value: string
  ) => void;
  onCellEditorUpdateValue?: (
    value: string,
    cancelEdit: boolean,
    dimFieldName?: string
  ) => void;
  onCellEditorMessage?: (message: string) => void;
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
    key: string
  ) => void;
  onAddChart?: (tableName: string) => void;
  onConvertToTable?: (tableName: string) => void;
  onConvertToChart?: (tableName: string) => void;
  onPaste?: (cells: string[][]) => void;
  onRemoveNote?: (tableName: string, fieldName: string) => void;
  onUpdateNote?: (tableName: string, fieldName: string, note: string) => void;
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
  onApplyNumericFilter?: (
    tableName: string,
    fieldName: string,
    operator: string,
    value: number | null
  ) => void;
  onApplyListFilter?: (
    tableName: string,
    fieldName: string,
    values: string[],
    isNumeric: boolean
  ) => void;
  onRemoveTotalByType?: (
    tableName: string,
    fieldName: string,
    type: TotalType
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
  onAddTotalExpression?: (
    tableName: string,
    fieldName: string,
    index: number,
    expression: string
  ) => void;
  onEditTotalExpression?: (
    tableName: string,
    fieldName: string,
    index: number,
    expression: string
  ) => void;
  onGetFieldFilterList?: (
    tableName: string,
    fieldName: string
  ) => GridListFilter[];
  onPromoteRow?: (tableName: string, dataIndex: number) => void;
  onCreateTableAction?: (
    action: string,
    type: string | undefined,
    insertFormula: string | undefined,
    tableName: string | undefined
  ) => void;
  onApplySuggestion?: (GPTSuggestions: GPTSuggestion[] | null) => void;
  onUndo?: () => void;
  onAIPendingChanges?: (isPending: boolean) => void;
  onAIPendingBanner?: (isVisible: boolean) => void;
  onOpenSheet?: (args: { sheetName: string }) => void;
  onArrangeTable?: (tableName: string, arrangeType: TableArrangeType) => void;
};

export type Theme = {
  themeName: AppTheme;
  grid: { lineColor: number; bgColor: number };
  cell: {
    borderColor: number;
    tableBorderColor: number;
    tableBorderAlpha: number;
    bgColor: number;
    bgEvenColor: number;
    tableHeaderBgColor: number;
    fieldHeaderBgColor: number;
    totalBgColor: number;
    cellFontColorName: FontColorName;
    cellFontFamily: FontFamilies;
    boldCellFontFamily: FontFamilies;
    boldCellFontColorName: FontColorName;
    keyFontFamily: FontFamilies;
    keyFontColorName: FontColorName;
    linkFontColorName: FontColorName;
    linkFontFamily: FontFamilies;
    resizerHoverColor: number;
    resizerActiveColor: number;
  };
  colNumber: {
    borderColor: number;
    bgColor: number;
    bgColorSelected: number;
    fontColorName: FontColorName;
    fontFamily: FontFamilies;
    resizerHoverColor: number;
    resizerActiveColor: number;
  };
  rowNumber: {
    bgColor: number;
    bgColorSelected: number;
    fontColorName: FontColorName;
    fontFamily: FontFamilies;
  };
  scrollBar: {
    trackColor: number;
    thumbColor: number;
    thumbColorHovered: number;
  };
  selection: { bgColor: number; bgAlpha: number; borderColor: number };
  pointClickSelection: {
    color: number;
    errorColor: number;
    alpha: 1;
    alignment: 0;
  };
  dottedSelection: { color: number; alpha: number; alignment: number };
  override: { borderColor: number };
  error: { borderColor: number };
  noteLabel: { bgColor: number };
  diff: { bgColor: number };
  dndSelection: { borderColor: number };
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
  icon?: PIXI.Sprite;
  secondaryIcon?: PIXI.Sprite; // e.g. for the table header context menu
};

export type CellStyle = {
  bgColor?: number;
  diffColor?: number;
  border?: {
    borderTop?: PIXI.ILineStyleOptions;
    borderRight?: PIXI.ILineStyleOptions;
    borderBottom?: PIXI.ILineStyleOptions;
    borderLeft?: PIXI.ILineStyleOptions;
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
