import {
  createContext,
  PropsWithChildren,
  useCallback,
  useMemo,
  useState,
} from 'react';

import { Grid, GridService } from '@frontend/spreadsheet';

type SpreadsheetContextActions = {
  onSpreadsheetMount: (gridApi: Grid, gridService: GridService) => void;
  gridService: GridService | null;
  gridApi: Grid | null;
};

export const SpreadsheetContext = createContext<SpreadsheetContextActions>(
  {} as SpreadsheetContextActions
);

export function SpreadsheetContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const [gridService, setGridService] = useState<GridService | null>(null);
  const [gridApi, setGridApi] = useState<Grid | null>(null);

  const onSpreadsheetMount = useCallback(
    (gridApi: Grid, gridService: GridService | null) => {
      setGridService(gridService);
      setGridApi(gridApi);
    },
    []
  );

  const value = useMemo(
    () => ({
      onSpreadsheetMount,
      gridService,
      gridApi,
    }),
    [onSpreadsheetMount, gridService, gridApi]
  );

  return (
    <SpreadsheetContext.Provider value={value}>
      {children}
    </SpreadsheetContext.Provider>
  );
}
