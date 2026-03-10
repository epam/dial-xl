import { JSX, PropsWithChildren, useRef } from 'react';

import { GridApi } from '@frontend/canvas-spreadsheet';

import { ExcelPreviewCanvasContext } from './ExcelPreviewCanvasContext';

export function ExcelPreviewCanvasContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const gridApiRef = useRef<GridApi>(null);

  return (
    <ExcelPreviewCanvasContext.Provider value={gridApiRef}>
      {children}
    </ExcelPreviewCanvasContext.Provider>
  );
}
