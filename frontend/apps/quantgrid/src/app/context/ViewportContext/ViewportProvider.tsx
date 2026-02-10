import { PropsWithChildren, useCallback, useMemo, useState } from 'react';

import { ColumnData, Index, Profile } from '@frontend/common';

import { ViewGridData } from './ViewGridData';
import { ViewportContext } from './ViewportContext';

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
