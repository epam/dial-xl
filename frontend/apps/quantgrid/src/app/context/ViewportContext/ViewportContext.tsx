import {
  createContext,
  PropsWithChildren,
  useCallback,
  useMemo,
  useState,
} from 'react';

import { ColumnData } from '@frontend/common';

import { ViewGridData } from './ViewGridData';

type ViewportContextValues = {
  viewGridData: ViewGridData;
};

type ViewportContextActions = {
  onColumnDataResponse: (columnData: ColumnData) => void;
  clearTablesData: () => void;
};

export const ViewportContext = createContext<
  ViewportContextActions & ViewportContextValues
>({} as ViewportContextActions & ViewportContextValues);

export function ViewportContextProvider({ children }: PropsWithChildren) {
  const [viewGridData] = useState(new ViewGridData());

  const clearTablesData = useCallback(() => {
    viewGridData.clear();
  }, [viewGridData]);

  const onColumnDataResponse = useCallback(
    (columnData: ColumnData) => {
      if (columnData?.totalKey) {
        viewGridData.saveTotalData(columnData);

        return;
      }

      viewGridData.saveNewColumnData(columnData);
    },
    [viewGridData]
  );

  const value = useMemo(
    () => ({
      viewGridData,
      onColumnDataResponse,
      clearTablesData,
    }),
    [viewGridData, onColumnDataResponse, clearTablesData]
  );

  return (
    <ViewportContext.Provider value={value}>
      {children}
    </ViewportContext.Provider>
  );
}
