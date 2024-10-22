import {
  FieldSortOrder,
  FormulasContextMenuKeyData,
  GPTSuggestion,
  GridListFilter,
  TableArrangeType,
} from '@frontend/common';
import { OverrideValue, TotalType } from '@frontend/parser';

import { GridCellEditorMode } from './components';
import { GridSelection } from './grid';

export type ContextMenuKeyData =
  | {
      col: number;
      row: number;
    }
  | FormulasContextMenuKeyData;

export type GridCellDimensions = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export enum SelectedCellType {
  EmptyCell = 'empty_cell',
  Cell = 'cell',
  Field = 'field',
  Table = 'table',
  Override = 'override',
  Total = 'total',
}

export interface SelectedCell {
  type: SelectedCellType;
  col: number;
  row: number;
  tableName?: string;
  value?: string;
  fieldName?: string;
  overrideIndex?: number;
  overrideValue?: OverrideValue;
  totalIndex?: number;
  isDynamic?: boolean;
}

export type HorizontalDirection = 'left' | 'right';

export type GridCallbacks = {
  onScroll?: (
    startCol: number,
    endCol: number,
    startRow: number,
    endRow: number
  ) => void;
  onSelectionChange?: (selection: SelectedCell | null) => void;
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
  onPointClickSelectValue?: (pointClickSelection: GridSelection | null) => void;
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
