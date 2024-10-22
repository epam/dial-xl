export enum GridTooltipEventType {
  Open = 'Open',
  Close = 'Close',
}

export type GridTooltipEventOpen = {
  type: GridTooltipEventType.Open;

  x: number;
  y: number;
  content: string;
};

export type GridTooltipEventClose = {
  type: GridTooltipEventType.Close;
};

export type GridTooltipEvent = GridTooltipEventOpen | GridTooltipEventClose;
