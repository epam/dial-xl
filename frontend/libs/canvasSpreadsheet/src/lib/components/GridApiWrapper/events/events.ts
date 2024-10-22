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

export type EventType =
  | EventTypeColumnResize
  | EventTypeColumnResizeDbClick
  | EventTypeResetCurrentColumnSizes
  | EventTypeOpenNote
  | EventTypeOpenAIPrompt
  | EventTypeExpandAIPrompt
  | EventTypeSelectAll;
