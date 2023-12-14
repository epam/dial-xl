import { BehaviorSubject, Subject } from 'rxjs';

export enum GridSelectionShortcutType {
  SelectAll = 'SelectAll',
  SelectColumn = 'SelectColumn',
  SelectRow = 'SelectRow',
  ExtendRangeSelection = 'ExtendRangeSelection',
  RangeSelection = 'RangeSelection',
  ArrowNavigation = 'ArrowNavigation',
  MoveSelectAll = 'MoveSelectAll',
  SelectionToRowEdge = 'SelectionToRowEdge',
}

export type GridSelectionShortcutSelectAll = {
  type: GridSelectionShortcutType.SelectAll;
};

export type GridSelectionShortcutSelectRow = {
  type: GridSelectionShortcutType.SelectRow;
};

export type GridSelectionShortcutSelectColumn = {
  type: GridSelectionShortcutType.SelectColumn;
};

export type GridSelectionShortcutExtendRangeSelection = {
  type: GridSelectionShortcutType.ExtendRangeSelection;
  direction: string;
};

export type GridSelectionShortcutArrowNavigation = {
  type: GridSelectionShortcutType.ArrowNavigation;
  direction: string;
};

export type GridSelectionShortcutRangeSelection = {
  type: GridSelectionShortcutType.RangeSelection;
  direction: string;
};

export type GridSelectionShortcutMoveSelectAll = {
  type: GridSelectionShortcutType.MoveSelectAll;
  rowDelta: number;
  colDelta: number;
};

export type GridSelectionShortcutToRowEdge = {
  type: GridSelectionShortcutType.SelectionToRowEdge;
  direction: string;
};

export type GridSelectionShortcut =
  | GridSelectionShortcutSelectAll
  | GridSelectionShortcutSelectColumn
  | GridSelectionShortcutSelectRow
  | GridSelectionShortcutExtendRangeSelection
  | GridSelectionShortcutArrowNavigation
  | GridSelectionShortcutRangeSelection
  | GridSelectionShortcutMoveSelectAll
  | GridSelectionShortcutToRowEdge;

export type GridSelection = {
  startCol: number;
  startRow: number;
  endRow: number;
  endCol: number;
};

export type ISelectionService = {
  selection$: BehaviorSubject<GridSelection | null>;

  shortcuts$: Subject<GridSelectionShortcut>;

  selectionEvents$: Subject<GridSelectionEvent>;

  getSelectedPinnedCols(): {
    startCol: number;
    endCol: number;
  } | null;

  selectTableHeader(startCol: number, endCol: number): void;

  setSelection(
    selection: GridSelection | null,
    moveMode?: boolean,
    hideMoveTooltip?: boolean
  ): void;

  clear: () => void;

  isTableHeaderSelected(): boolean;

  getCellDimensions: (element: HTMLElement) => {
    row: number;
    col: number;
    width: number;
    height: number;
    x: number;
    y: number;
  };
};

export enum GridSelectionEventType {
  StartMoveMode = 'StartMoveMode',
  StopMoveMode = 'StopMoveMode',
}

export type GridSelectionEventStartMoveMode = {
  type: GridSelectionEventType.StartMoveMode;
};

export type GridSelectionEventStopMoveMode = {
  type: GridSelectionEventType.StopMoveMode;
};

export type GridSelectionEvent =
  | GridSelectionEventStartMoveMode
  | GridSelectionEventStopMoveMode;
