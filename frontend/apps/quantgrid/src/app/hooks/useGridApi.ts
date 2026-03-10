import { useContext } from 'react';

import { CanvasSpreadsheetContext } from '../context';

export function useGridApi() {
  const gridApiRef = useContext(CanvasSpreadsheetContext);

  // eslint-disable-next-line react-hooks/refs
  return gridApiRef.current;
}
