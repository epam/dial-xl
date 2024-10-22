import { Observable } from 'rxjs';

import { IColumnState } from '@deltix/grid-it-core';

export enum GridEvent {
  // global
  columnState = 'columnState',
  // header
  columnResize = 'columnResize',
  columnResizeDbClick = 'columnResizeDbClick',
  resetCurrentColumnSizes = 'resetCurrentColumnSizes',
  // note
  openNote = 'openNote',
  // ai prompt
  openAIPrompt = 'openAIPrompt',
  expandAIPrompt = 'expandAIPrompt',
}

export type EventTypeColumnState = {
  type: GridEvent.columnState;
  event: IColumnState[];
};
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
export type EventTypeOpenAIPrompt = {
  type: GridEvent.openAIPrompt;

  col: number;
  row: number;
};
export type EventTypeExpandAIPrompt = {
  type: GridEvent.expandAIPrompt;
};

export type EventType =
  | EventTypeColumnState
  | EventTypeColumnResize
  | EventTypeColumnResizeDbClick
  | EventTypeResetCurrentColumnSizes
  | EventTypeOpenNote
  | EventTypeOpenAIPrompt
  | EventTypeExpandAIPrompt;

export type IEventsService = {
  events$: Observable<EventType>;
  emit(event: EventType): void;
};
