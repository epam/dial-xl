import {
  createContext,
  PropsWithChildren,
  useCallback,
  useMemo,
  useState,
} from 'react';

import { ColumnData, Index, Profile } from '@frontend/common';

import { ViewGridData } from './ViewGridData';

type ViewportContextValues = {
  viewGridData: ViewGridData;
};

type ViewportContextActions = {
  onColumnDataResponse: (columnData: ColumnData) => void;
  onProfileResponse: (requestId: string, profile: Profile) => void;
  onIndexResponse: (index: Index) => void;
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

  const onProfileResponse = useCallback(
    (requestId: string, profile: Profile) => {
      viewGridData.saveProfileData(requestId, profile);
    },
    [viewGridData]
  );

  const onIndexResponse = useCallback(
    (index: Index) => {
      viewGridData.saveIndexData(index);
    },
    [viewGridData]
  );

  const value = useMemo(
    () => ({
      viewGridData,
      onColumnDataResponse,
      clearTablesData,
      onProfileResponse,
      onIndexResponse,
    }),
    [
      viewGridData,
      onColumnDataResponse,
      clearTablesData,
      onProfileResponse,
      onIndexResponse,
    ]
  );

  return (
    <ViewportContext.Provider value={value}>
      {children}
    </ViewportContext.Provider>
  );
}
