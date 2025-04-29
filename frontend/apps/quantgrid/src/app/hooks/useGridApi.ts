import { useContext } from 'react';

import { CanvasSpreadsheetContext } from '../context';

export function useGridApi() {
  const gridApiRef = useContext(CanvasSpreadsheetContext);

  return gridApiRef.current;
}
