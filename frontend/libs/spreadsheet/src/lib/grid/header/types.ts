import { IGui } from '@deltix/grid-it-core';

export type IHeader = IGui & {
  setZoom(zoom: number): void;
  rerender(columnFirstIndex: number, columnLastIndex: number): void;
};
