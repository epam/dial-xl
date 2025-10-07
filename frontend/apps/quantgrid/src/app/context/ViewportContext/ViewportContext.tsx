import { createContext } from 'react';

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
