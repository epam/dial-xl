import { JSX, PropsWithChildren, useRef } from 'react';

import { GridApi } from '@frontend/canvas-spreadsheet';

import { CanvasSpreadsheetContext } from './CanvasSpreadsheetContext';

export function CanvasSpreadsheetContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const gridApiRef = useRef<GridApi>(null);

  return (
    <CanvasSpreadsheetContext.Provider value={gridApiRef}>
      {children}
    </CanvasSpreadsheetContext.Provider>
  );
}
