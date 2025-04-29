import { ChartType, FormulasContextMenuKeyData } from '@frontend/common';

export type ContextMenuKeyData =
  | {
      col: number;
      row: number;
      chartType?: ChartType;
      fieldName?: string;
    }
  | FormulasContextMenuKeyData;

export type OpenContextMenuParams = {
  x: number;
  y: number;
  col: number;
  row: number;
};

export enum GridContextMenuEventType {
  Open = 'Open',
}

export type GridContextMenuEventOpen = {
  type: GridContextMenuEventType.Open;

  x: number;
  y: number;
  col: number;
  row: number;
  source: 'canvas-element' | 'html-element';
};

export type GridContextMenuEvent = GridContextMenuEventOpen;
