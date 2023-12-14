import { Subject } from 'rxjs';

export type ICellEditorService = {
  cellEditorEvents$: Subject<GridCellEditorEvent>;
  hide: () => void;
  focus: () => void;
  openExplicitly: (col: number, row: number, value: string) => void;
  setValue: (value: string) => void;
};

export enum GridCellEditorEventType {
  Rename = 'Rename',
  Edit = 'Edit',
  EditOverride = 'EditOverride',
  AddOverride = 'AddOverride',
  Hide = 'Hide',
  OpenExplicitly = 'OpenExplicitly',
  SetValue = 'SetValue',
  Focus = 'Focus',
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
};

export type GridCellEditorEventSetValue = {
  type: GridCellEditorEventType.SetValue;
  value: string;
};

export type GridCellEditorEventFocus = {
  type: GridCellEditorEventType.Focus;
};

export type GridCellEditorEvent =
  | GridCellEditorEventRename
  | GridCellEditorEventEdit
  | GridCellEditorEventAddOverride
  | GridCellEditorEventEditOverride
  | GridCellEditorEventHide
  | GridCellEditorEventOpenExplicitly
  | GridCellEditorEventSetValue
  | GridCellEditorEventFocus;
