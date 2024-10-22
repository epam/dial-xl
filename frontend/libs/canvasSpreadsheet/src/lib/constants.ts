export const defaultGridSizes = {
  edges: {
    col: 1000,
    row: 100000,
  },
  gridLine: {
    width: 1,
  },
  cell: {
    height: 20,
    resizerWidth: 6,
    width: 65,
    minWidth: 20,
    minHeight: 20,
    fontSize: 14,
    padding: 4,
    totalIconSize: 12,
    applyIconSize: 10,
    borderWidth: 1,
    tableBorderWidth: 2,
  },
  rowNumber: {
    width: 30,
    height: 20,
    fontSize: 14,
    padding: 5,
  },
  colNumber: {
    height: 20,
    fontSize: 14,
    padding: 5,
    resizerWidth: 6,
    width: 65,
  },
  scrollBar: {
    trackSize: 16,
    thumbHeight: 9,
    thumbBorderRadius: 3,
    arrowSize: 8,
    arrowWrapperSize: 16,
    minThumbWidth: 100,
  },
  selection: {
    width: 1,
    moveTableIconWidth: 53,
    moveTableIconHeight: 24,
    moveTableIconMargin: 5,
    moveTableIconScale: 1,
  },
  override: {
    width: 1,
  },
  pointClick: {
    width: 2,
  },
  error: {
    width: 1,
    tooltipMargin: 5,
    circleRadius: 4,
  },
  dottedSelection: {
    width: 1,
    dash: 3,
  },
  noteLabel: {
    size: 8,
  },
};

export type GridSizes = typeof defaultGridSizes & {
  [scope: string]: { [param: string]: number };
};

export const adjustmentFontMultiplier = 0.35;

export const defaultViewportEdges = {
  startRow: 0,
  endRow: 0,
  startCol: 0,
  endCol: 0,
};

export const defaultViewportCoords = {
  x1: 0,
  y1: 0,
  x2: 0,
  y2: 0,
};

export const extendedRowsCount = 2;
export const extendedColsCount = 2;

export enum ComponentLayer {
  Cells = 1,
  Icon = 2,
  Override = 3,
  Error = 4,
  NoteLabel = 5,
  RowNumbers = 6,
  ColNumbers = 7,
  CornerRect = 8,
  DottedSelection = 10,
  Selection = 11,
  DNDSelection = 12,
  Resizer = 13,
  ScrollBar = 14,
}

export const canvasId = 'canvas-spreadsheet';
export const cellEditorWrapperId = 'cellEditorWrapper';
export const cellEditorContainerId = 'cellEditorContainer';
