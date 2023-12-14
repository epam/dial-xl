import { Observable } from 'rxjs';

import { Column, IColumnState } from '@deltix/grid-it-core';

export enum GridEvent {
  // global
  filter = 'filter',
  columnState = 'columnState',
  columns = 'columns',
  contextmenu = 'contextmenu',
  sort = 'sort',
  // row
  rowDblClick = 'rowDblClick',
  rowClick = 'rowClick',
  // header
  headerClick = 'headerClick',
  activeTabIndex = 'activeTabIndex',
  columnResize = 'columnResize',
  columnResizeDbClick = 'columnResizeDbClick',
}
export type BaseEventType<T extends keyof GridEvent, E = unknown> = {
  type: T;
  event: E;
};
type IWrappedRowClickEvent = {
  event: Event;
  index: number;
  target: HTMLElement;
  data: any; // TODO: Generic type definition
};
export type EventTypeFilter = {
  type: GridEvent.filter;
};
export type EventTypeSort = {
  type: GridEvent.sort;
};
export type EventTypeColumnState = {
  type: GridEvent.columnState;
  event: IColumnState[];
};
export type EventTypeRowClick = {
  type: GridEvent.rowClick;
  event: IWrappedRowClickEvent;
};
export type EventTypeRowDblClick = {
  type: GridEvent.rowDblClick;
  event: IWrappedRowClickEvent;
};
export type EventTypeContextmenu = {
  type: GridEvent.contextmenu;
  event: IWrappedRowClickEvent;
};
export type EventTypeHeaderClick = {
  type: GridEvent.headerClick;
  event: Event;
  column: Column;
};
export type EventTypeActiveTabIndex = {
  type: GridEvent.activeTabIndex;
  activeTabIndex: number | null;
};
export type EventTypeColumnResize = {
  type: GridEvent.columnResize;

  column: Column;
  width: number;
};
export type EventTypeColumnResizeDbClick = {
  type: GridEvent.columnResizeDbClick;

  column: Column;
};

export type EventType =
  | EventTypeFilter
  | EventTypeSort
  | EventTypeColumnState
  | EventTypeRowClick
  | EventTypeRowDblClick
  | EventTypeContextmenu
  | EventTypeHeaderClick
  | EventTypeActiveTabIndex
  | EventTypeColumnResize
  | EventTypeColumnResizeDbClick;

export type IEventsService = {
  events$: Observable<EventType>;
  emit(event: EventType): void;
};
