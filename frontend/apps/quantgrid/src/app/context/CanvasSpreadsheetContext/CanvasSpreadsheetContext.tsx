import { createContext, createRef, RefObject } from 'react';

import { GridApi } from '@frontend/canvas-spreadsheet';

export const CanvasSpreadsheetContext = createContext(
  createRef() as RefObject<GridApi>
);
