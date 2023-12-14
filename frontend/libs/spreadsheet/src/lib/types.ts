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
}

export interface SelectedCell {
  type: SelectedCellType;
  col: number;
  row: number;
  tableName?: string;
  value?: string;
  fieldName?: string;
  overrideIndex?: number;
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
  onSwapFields?: (
    tableName: string,
    rightFieldName: string,
    leftFieldName: string,
    direction: HorizontalDirection
  ) => void;
  onEditExpression?: (
    tableName: string,
    fieldName: string,
    expression: string
  ) => void;
  onMoveTable?: (tableName: string, rowDelta: number, colDelta: number) => void;
  onDNDTable?: (tableName: string, row: number, col: number) => void;
  onRemoveDimension?: (tableName: string, fieldName: string) => void;
  onAddKey?: (tableName: string, fieldName: string) => void;
  onRemoveKey?: (tableName: string, fieldName: string) => void;
  onCloseTable?: (tableName: string) => void;
  onAddDimension?: (tableName: string, fieldName: string) => void;
  onCreateDerivedTable?: (tableName: string) => void;
  onCellEditorSubmit?: (
    col: number,
    overrideIndex: number,
    value: string
  ) => void;
  onRemoveOverride?: (
    tableName: string,
    fieldName: string,
    overrideIndex: number,
    value: string
  ) => void;
  onAddOverride?: (
    tableName: string,
    fieldName: string,
    row: number,
    value: string
  ) => void;
  onEditOverride?: (
    tableName: string,
    fieldName: string,
    overrideIndex: number,
    value: string
  ) => void;
  onCellEditorUpdateValue?: (value: string, cancelEdit: boolean) => void;
  onCellEditorMessage?: (message: string) => void;
  onExpandDimTable?: (
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
};
