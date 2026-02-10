import { GridCell } from '../../../types';

export enum GridEvent {
  // header
  columnResize = 'columnResize',
  columnResizeDbClick = 'columnResizeDbClick',
  resetCurrentColumnSizes = 'resetCurrentColumnSizes',
  // note
  openNote = 'openNote',
  // ai prompt
  openAIPrompt = 'openAIPrompt',
  expandAIPrompt = 'expandAIPrompt',
  // selection
  selectAll = 'selectAll',
  startMoveMode = 'startMoveMode',
  stopMoveMode = 'stopMoveMode',
  // control
  openControl = 'openControl',
  // move table/chart
  moveChartOrTable = 'moveChartOrTable',
  startMoveEntity = 'startMoveEntity',
  stopMoveEntity = 'stopMoveEntity',
}

export type EventTypeColumnResize = {
  type: GridEvent.columnResize;

  column: number;
  width: number;
};

export type EventTypeColumnResizeDbClick = {
  type: GridEvent.columnResizeDbClick;

  column: number;
};
export type EventTypeResetCurrentColumnSizes = {
  type: GridEvent.resetCurrentColumnSizes;
};

export type EventTypeOpenNote = {
  type: GridEvent.openNote;

  col: number;
  row: number;
};

export type EventTypeOpenControl = {
  type: GridEvent.openControl;

  cellData: GridCell;
};

export type EventTypeOpenAIPrompt = {
  type: GridEvent.openAIPrompt;

  col: number;
  row: number;
};

export type EventTypeSelectAll = {
  type: GridEvent.selectAll;

  tableName?: string;
  selectFromCurrentCell?: boolean;
};

export type EventTypeExpandAIPrompt = {
  type: GridEvent.expandAIPrompt;
};

export type EventTypeStartMoveMode = {
  type: GridEvent.startMoveMode;
};

export type EventTypeStopMoveMode = {
  type: GridEvent.stopMoveMode;
};

export type EventTypeMoveChartOrTable = {
  type: GridEvent.moveChartOrTable;

  cell: GridCell;
  x: number;
  y: number;
};

export type EventTypeStartMoveEntity = {
  type: GridEvent.startMoveEntity;
};

export type EventTypeStopMoveEntity = {
  type: GridEvent.stopMoveEntity;
};

export type EventType =
  | EventTypeColumnResize
  | EventTypeColumnResizeDbClick
  | EventTypeResetCurrentColumnSizes
  | EventTypeOpenNote
  | EventTypeOpenAIPrompt
  | EventTypeExpandAIPrompt
  | EventTypeSelectAll
  | EventTypeStartMoveMode
  | EventTypeStopMoveMode
  | EventTypeOpenControl
  | EventTypeMoveChartOrTable
  | EventTypeStartMoveEntity
  | EventTypeStopMoveEntity;
