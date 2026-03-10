import {
  GridCell,
  GridCellEditorMode,
  GridData,
  HorizontalDirection,
  SelectionEdges,
} from '@frontend/canvas-spreadsheet';
import {
  CellPlacement,
  ChartType,
  FieldSortOrder,
  GPTFocusColumn,
  GPTSuggestion,
  GridFilterType,
  TableArrangeType,
} from '@frontend/common';
import { ControlType, OverrideValue, TotalType } from '@frontend/parser';

import { PanelName, SelectedCell } from '../../common';
import { GroupByTableWizardMode, PivotTableWizardMode } from '../../store';

export interface SelectionServices {
  data: GridData;
  getSelectedCell: (
    sel: SelectionEdges | null,
    data: GridData,
  ) => CellPlacement | null;
  updateSelectedCell: (selectedCell: SelectedCell | null) => void;
  switchPointClickMode: (on: boolean, source?: 'cell-editor') => void;
  handlePointClickSelectValue: (arg1: null, sel: SelectionEdges | null) => void;
  deleteSelectedFieldOrTable: () => void;
}

export interface ViewportServices {
  onScroll: (args: {
    startCol: number;
    endCol: number;
    startRow: number;
    endRow: number;
    forceRequest?: boolean;
    withCompilation: boolean;
  }) => void;
  closeAllPanels: () => void;
}

export interface EditorServices {
  setEditMode: (m: GridCellEditorMode) => void;
  submitCellEditor: ({
    editMode,
    currentCell,
    cell,
    value,
    dimFieldName,
  }: {
    editMode: GridCellEditorMode;
    currentCell: CellPlacement;
    cell: GridCell | undefined;
    value: string;
    dimFieldName?: string;
  }) => boolean;
  onCellEditorUpdateValue: (
    value: string,
    cancelEdit: boolean,
    dimFieldName?: string,
  ) => void;
}

export interface ChartsServices {
  changePivotTableWizardMode: (
    mode: PivotTableWizardMode,
    tableName?: string,
  ) => void;
  changeGroupByTableWizardMode: (
    mode: GroupByTableWizardMode,
    tableName?: string,
  ) => void;
  openPanel: (p: PanelName) => void;
  addChart: (
    tableName: string,
    chartType: ChartType,
    col?: number,
    row?: number,
  ) => void;
  chartResize: (tableName: string, cols: number, rows: number) => void;
  selectChartKey: (
    tableName: string,
    fieldName: string,
    key: string | string[],
    hasNoData?: boolean,
  ) => void;
  getMoreChartKeys: (tableName: string, fieldName: string) => void;
  setChartType: (tableName: string, chartType: ChartType) => void;
}

export interface ClipboardServices {
  pasteCells: (cells: string[][]) => void;
}

export interface TablesServices {
  deleteTable: (tableName: string) => void;
  renameTable: (oldName: string, newName: string) => void;
  moveTable: (tableName: string, rowDelta: number, colDelta: number) => void;
  cloneTable: (tableName: string) => void;
  flipTable: (tableName: string) => void;
  moveTableTo: (tableName: string, row: number, col: number) => void;
  toggleTableTitleOrHeaderVisibility: (
    tableName: string,
    toggleTableHeader: boolean,
  ) => void;
  addTableRow: (
    col: number,
    row: number,
    tableName: string,
    value: string,
  ) => void;
  addTableRowToEnd: (tableName: string, value: string) => void;
  promoteRow: (tableName: string, dataIndex: number) => void;
  arrangeTable: (tableName: string, arrangeType: TableArrangeType) => void;
  downloadTable: (tableName: string) => void;
  onSwitchInput: (tableName: string, fieldName: string) => void;
  syncSingleImportField: (tableName: string, fieldName: string) => void;
  onCreateTableAction: (
    action: string,
    type: string | undefined,
    insertFormula: string | undefined,
    tableName: string | undefined,
  ) => void;
  changeFieldDescription: (
    tableName: string,
    fieldName: string,
    descriptionFieldName: string,
    isRemove?: boolean,
  ) => void;
  createDerivedTable: (tableName: string) => void;
  createManualTable: (
    col: number,
    row: number,
    cells: string[][],
    hideTableHeader?: boolean,
    hideFieldHeader?: boolean,
    customTableName?: string,
  ) => void;
  expandDimTable: (
    tableName: string,
    fieldName: string,
    col: number,
    row: number,
  ) => Promise<void>;
  showRowReference: (
    tableName: string,
    fieldName: string,
    col: number,
    row: number,
  ) => Promise<void>;
  convertToTable: (tableName: string) => void;
}

export interface FieldsServices {
  deleteField: (tableName: string, fieldName: string) => void;
  addField: (tableName: string, fieldText: string, insertOptions?: any) => void;
  swapFieldsByDirection: (
    tableName: string,
    fieldName: string,
    direction: HorizontalDirection,
  ) => void;
  autoFitTableFields: (tableName: string) => void;
  removeFieldSizes: (tableName: string) => void;
  onIncreaseFieldColumnSize: (tableName: string, fieldName: string) => void;
  onDecreaseFieldColumnSize: (tableName: string, fieldName: string) => void;
  onChangeFieldColumnSize: (
    tableName: string,
    fieldName: string,
    valueAdd: number,
  ) => void;
  changeFieldDimension: (
    tableName: string,
    fieldName: string,
    isRemove?: boolean,
  ) => void;
  changeFieldKey: (
    tableName: string,
    fieldName: string,
    isRemove?: boolean,
  ) => void;
  changeFieldIndex: (
    tableName: string,
    fieldName: string,
    isRemove?: boolean,
  ) => void;
  createControlFromField: (
    tableName: string,
    fieldName: string,
    type: ControlType,
  ) => void;
  regenerateAIFunctions: (tableName: string, fieldName: string) => void;
}

export interface TotalsServices {
  removeTotalByIndex: (
    tableName: string,
    fieldName: string,
    index: number,
  ) => void;
  toggleTotalByType: (
    tableName: string,
    fieldName: string,
    type: TotalType,
  ) => void;
  addAllFieldTotals: (tableName: string, fieldName: string) => void;
  createAllTableTotals: (tableName: string) => void;
}

export interface FiltersServices {
  applyListFilter: (
    tableName: string,
    fieldName: string,
    values: string[],
    type: 'selected' | 'unselected',
    isNumeric: boolean,
  ) => void;
  applyConditionFilter: (
    tableName: string,
    fieldName: string,
    operator: string,
    value: string | string[] | null,
    filterType: GridFilterType,
  ) => void;
  applyControlFilter: (
    tableName: string,
    fieldName: string,
    controlTableName: string,
    controlFieldName: string,
    controlType: ControlType,
  ) => void;
  applyCustomFormulaFilter: (
    tableName: string,
    fieldName: string,
    expression: string,
  ) => void;
  clearFieldFilters: (tableName: string, fieldName: string) => void;
  onUpdateFieldFilterList: ({
    tableName,
    fieldName,
    getMoreValues,
    searchValue,
    sort,
  }: {
    tableName: string;
    fieldName: string;
    getMoreValues?: boolean;
    searchValue: string;
    sort: 1 | -1;
  }) => void;
}

export interface ControlServices {
  onUpdateControlValues: ({
    tableName,
    fieldName,
    getMoreValues,
    searchValue,
  }: {
    tableName: string;
    fieldName: string;
    getMoreValues?: boolean;
    searchValue: string;
  }) => void;
  updateSelectedControlValue: (
    tableName: string,
    fieldName: string,
    values: string[],
  ) => void;
  onCloseControl: () => void;
}

export interface OverridesServices {
  removeOverride: (
    tableName: string,
    fieldName: string,
    overrideIndex: number,
    value: OverrideValue,
  ) => void;
  removeTableOrOverrideRow: (tableName: string, overrideIndex: number) => void;
  regenerateOverride: (
    tableName: string,
    fieldName: string,
    overrideIndex: number,
  ) => void;
}

export interface NotesServices {
  updateNote: ({
    tableName,
    fieldName,
    note,
  }: {
    tableName: string;
    fieldName?: string;
    note: string | null;
  }) => void;
  removeNote: (tableName: string, fieldName?: string) => void;
}

export interface SortServices {
  changeFieldSort: (
    tableName: string,
    fieldName: string,
    order: FieldSortOrder,
  ) => void;
}

export interface SystemServices {
  undo: () => void;
  openSheet: (args: { sheetName: string }) => void;
  openInEditor: (
    tableName: string,
    fieldName?: string,
    openOverride?: boolean,
  ) => void;
  openInDetailsPanel: (tableName: string) => void;
  applySuggestion: (s: GPTSuggestion[] | null, f: GPTFocusColumn[]) => void;
}

export type GridServices = SelectionServices &
  ViewportServices &
  EditorServices &
  ChartsServices &
  ClipboardServices &
  TablesServices &
  FieldsServices &
  TotalsServices &
  FiltersServices &
  ControlServices &
  OverridesServices &
  NotesServices &
  SortServices &
  SystemServices;
