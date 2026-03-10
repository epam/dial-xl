import { createContext, createRef, RefObject } from 'react';

import { GridApi } from '@frontend/canvas-spreadsheet';

export const ExcelPreviewCanvasContext = createContext(
  createRef() as RefObject<GridApi | null>,
);
