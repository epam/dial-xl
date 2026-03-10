export const defaultGridSizes = {
  edges: {
    col: 200,
    row: 2000,
    maxCol: 1000000,
    maxRow: 100000000,
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
    fontSize: 12,
    padding: 3,
    totalIconSize: 12,
    controlIconSize: 14,
    applyIconSize: 10,
    borderWidth: 1,
    shadowStepWidth: 1,
    tableMoveBorderWidth: 6,
  },
  rowNumber: {
    minWidth: 35,
    width: 35,
    height: 20,
    fontSize: 12,
    padding: 7,
  },
  colNumber: {
    height: 20,
    fontSize: 12,
    padding: 5,
    resizerWidth: 6,
    width: 65,
    borderWidth: 1,
    minWidth: 20,
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
    width: 1.5,
    dash: 5,
  },
  noteLabel: {
    size: 8,
  },
  tableShadow: {
    rectangleLineWidth: 4,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  },
};

export type GridSizes = typeof defaultGridSizes & {
  [scope: string]: { [param: string]: number };
};

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
  GridLines = -1,
  HiddenCells = 1,
  Cells = 2,
  Icon = 3,
  Override = 4,
  Error = 5,
  NoteLabel = 6,
  DottedSelection = 7,
  Selection = 8,
  DNDSelection = 9,
  RowNumbers = 10,
  ColNumbers = 11,
  CornerRect = 12,
  Resizer = 13,
  ScrollBar = 14,
  TableMoveHandle = 15,
}

export const cellEditorWrapperId = 'cellEditorWrapper';
export const cellEditorContainerId = 'cellEditorContainer';
export const noteTextAreaId = 'noteTextArea';

export const mouseRightButton = 2;

export const viewportColStep = 40;
export const viewportRowStep = 400;
export const viewportPrefetchCols = 20;
export const viewportPrefetchRows = 80;
