import { BehaviorSubject, Subject } from 'rxjs';

export enum GridSelectionShortcutType {
  SelectAll = 'SelectAll',
  SelectColumn = 'SelectColumn',
  SelectRow = 'SelectRow',
  ExtendRangeSelection = 'ExtendRangeSelection',
  MoveSelectAll = 'MoveSelectAll',
  SelectionToRowEdge = 'SelectionToRowEdge',
  EnterAfterEditNavigation = 'EnterAfterEditNavigation',
  TabNavigation = 'TabNavigation',
  ArrowRightAfterEditNavigation = 'ArrowRightAfterEditNavigation',
  ArrowLeftAfterEditNavigation = 'ArrowLeftAfterEditNavigation',
  ArrowBottomAfterEditNavigation = 'ArrowBottomAfterEditNavigation',
  ArrowTopAfterEditNavigation = 'ArrowTopAfterEditNavigation',
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

export type GridSelectionShortcutMoveSelectAll = {
  type: GridSelectionShortcutType.MoveSelectAll;
  rowDelta: number;
  colDelta: number;
};

export type GridSelectionShortcutToRowEdge = {
  type: GridSelectionShortcutType.SelectionToRowEdge;
  direction: string;
};

export type GridSelectionShortcutEnterAfterEditNavigation = {
  type: GridSelectionShortcutType.EnterAfterEditNavigation;
};

export type GridSelectionShortcutTabNavigation = {
  type: GridSelectionShortcutType.TabNavigation;
};

export type GridSelectionShortcutArrowRightAfterEditNavigation = {
  type: GridSelectionShortcutType.ArrowRightAfterEditNavigation;
};
export type GridSelectionShortcutArrowLeftAfterEditNavigation = {
  type: GridSelectionShortcutType.ArrowLeftAfterEditNavigation;
};
export type GridSelectionShortcutArrowTopAfterEditNavigation = {
  type: GridSelectionShortcutType.ArrowTopAfterEditNavigation;
};
export type GridSelectionShortcutArrowBottomAfterEditNavigation = {
  type: GridSelectionShortcutType.ArrowBottomAfterEditNavigation;
};

export type GridSelectionShortcut =
  | GridSelectionShortcutSelectAll
  | GridSelectionShortcutSelectColumn
  | GridSelectionShortcutSelectRow
  | GridSelectionShortcutExtendRangeSelection
  | GridSelectionShortcutMoveSelectAll
  | GridSelectionShortcutToRowEdge
  | GridSelectionShortcutEnterAfterEditNavigation
  | GridSelectionShortcutTabNavigation
  | GridSelectionShortcutArrowRightAfterEditNavigation
  | GridSelectionShortcutArrowLeftAfterEditNavigation
  | GridSelectionShortcutArrowTopAfterEditNavigation
  | GridSelectionShortcutArrowBottomAfterEditNavigation;

export type GridSelection = {
  startCol: number;
  startRow: number;
  endRow: number;
  endCol: number;
};

export type ISelectionService = {
  selection: GridSelection | null;

  selection$: BehaviorSubject<GridSelection | null>;

  shortcuts$: Subject<GridSelectionShortcut>;

  selectionEvents$: Subject<GridSelectionEvent>;

  getSelectedPinnedCols(): {
    startCol: number;
    endCol: number;
  } | null;

  setSelection(
    selection: GridSelection | null,
    moveMode?: boolean,
    hideMoveTooltip?: boolean
  ): void;

  showDottedSelection(selection: GridSelection): void;
  hideDottedSelection(): void;

  clear: () => void;

  onKeyDown: (event: KeyboardEvent) => void;

  isTargetCell(target: EventTarget | null): boolean;

  switchPointClickMode: (isPointClickMode: boolean) => void;
  setPointClickError: (error: boolean) => void;
};

export enum GridSelectionEventType {
  StartMoveMode = 'StartMoveMode',
  StopMoveMode = 'StopMoveMode',
  PointClickSelectValue = 'PointClickSelectValue',
}

export type GridSelectionEventStartMoveMode = {
  type: GridSelectionEventType.StartMoveMode;
};

export type GridSelectionEventStopMoveMode = {
  type: GridSelectionEventType.StopMoveMode;
};

export type GridSelectionEventPointClickSelectValue = {
  type: GridSelectionEventType.PointClickSelectValue;
  pointClickSelection: GridSelection | null;
};

export type GridSelectionEvent =
  | GridSelectionEventStartMoveMode
  | GridSelectionEventStopMoveMode
  | GridSelectionEventPointClickSelectValue;

export type MoveParams = {
  rowDelta: number;
  colDelta: number;
  hideMoveTooltip?: boolean;
};

export type SelectionBackup = {
  moveParams: MoveParams | null;
  selection: GridSelection | null;
};
