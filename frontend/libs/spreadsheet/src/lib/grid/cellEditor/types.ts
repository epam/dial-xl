import { Subject } from 'rxjs';

export type ICellEditorService = {
  cellEditorEvents$: Subject<GridCellEditorEvent>;
  hide: () => void;
  focus: () => void;
  openExplicitly: (
    col: number,
    row: number,
    value: string,
    options?: {
      dimFieldName?: string;
      withFocus?: boolean;
    }
  ) => void;
  setValue: (value: string) => void;
  insertValue: (
    value: string,
    options?: { valueCursorOffset?: number }
  ) => void;
  setPointClickValue: (value: string) => void;
};

export enum GridCellEditorEventType {
  Rename = 'Rename',
  Edit = 'Edit',
  EditOverride = 'EditOverride',
  AddOverride = 'AddOverride',
  Hide = 'Hide',
  OpenExplicitly = 'OpenExplicitly',
  SetValue = 'SetValue',
  InsertValue = 'AppendValue',
  Focus = 'Focus',
  SetPointClickValue = 'SetPointClickValue',
  AddTotal = 'AddTotal',
  EditTotal = 'EditTotal',
}

export type GridCellEditorEventRename = {
  type: GridCellEditorEventType.Rename;

  col: number;
  row: number;
};

export type GridCellEditorEventEdit = {
  type: GridCellEditorEventType.Edit;

  col: number;
  row: number;
};

export type GridCellEditorEventAddOverride = {
  type: GridCellEditorEventType.AddOverride;

  col: number;
  row: number;
};

export type GridCellEditorEventEditOverride = {
  type: GridCellEditorEventType.EditOverride;

  col: number;
  row: number;
};

export type GridCellEditorEventHide = {
  type: GridCellEditorEventType.Hide;
};

export type GridCellEditorEventOpenExplicitly = {
  type: GridCellEditorEventType.OpenExplicitly;

  col: number;
  row: number;
  value: string;
  options?: {
    dimFieldName?: string;
    withFocus?: boolean;
  };
};

export type GridCellEditorEventSetValue = {
  type: GridCellEditorEventType.SetValue;
  value: string;
};

export type GridCellEditorEventInsertValue = {
  type: GridCellEditorEventType.InsertValue;
  value: string;

  // valueCursorOffset - used when we need to set cursor to some place inside of added value after inserting it
  options?: { valueCursorOffset?: number };
};

export type GridCellEditorEventFocus = {
  type: GridCellEditorEventType.Focus;
};

export type GridCellEditorEventSetPointClickValue = {
  type: GridCellEditorEventType.SetPointClickValue;
  value: string;
};

export type GridCellEditorEventEditTotal = {
  type: GridCellEditorEventType.EditTotal;

  col: number;
  row: number;
};

export type GridCellEditorEventAddTotal = {
  type: GridCellEditorEventType.AddTotal;

  col: number;
  row: number;
};

export type GridCellEditorEvent =
  | GridCellEditorEventRename
  | GridCellEditorEventEdit
  | GridCellEditorEventAddOverride
  | GridCellEditorEventEditOverride
  | GridCellEditorEventHide
  | GridCellEditorEventOpenExplicitly
  | GridCellEditorEventSetValue
  | GridCellEditorEventInsertValue
  | GridCellEditorEventFocus
  | GridCellEditorEventSetPointClickValue
  | GridCellEditorEventEditTotal
  | GridCellEditorEventAddTotal;
