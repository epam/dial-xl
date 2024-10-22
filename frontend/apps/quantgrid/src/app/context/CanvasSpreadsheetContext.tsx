import {
  createContext,
  createRef,
  JSX,
  PropsWithChildren,
  RefObject,
  useRef,
} from 'react';

import { GridApi } from '@frontend/canvas-spreadsheet';

export const CanvasSpreadsheetContext = createContext(
  createRef() as RefObject<GridApi>
);

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
