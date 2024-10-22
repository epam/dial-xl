import { useContext } from 'react';

import {
  AppContext,
  CanvasSpreadsheetContext,
  SpreadsheetContext,
} from '../context';

export function useGridApi() {
  const gridApiRef = useContext(CanvasSpreadsheetContext);
  const { gridApi } = useContext(SpreadsheetContext);
  const { canvasSpreadsheetMode } = useContext(AppContext);

  if (canvasSpreadsheetMode) {
    return gridApiRef.current;
  }

  return gridApi;
}
