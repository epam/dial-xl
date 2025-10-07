import { createContext } from 'react';

import {
  ResourceMetadata,
  SharedByMeMetadata,
  SharedWithMeMetadata,
} from '@frontend/common';

import {
  DashboardFilter,
  DashboardItem,
  DashboardSortFn,
  DashboardSortType,
  DashboardTab,
} from '../../types/dashboard';

type DashboardContextActions = {
  setSearchValue: (value: string) => void;
  search: (searchValue: string) => void;
  sortChange: (
    newSortType: DashboardSortType,
    newSortFn: DashboardSortFn | undefined
  ) => void;
  setFilter: (filter: DashboardFilter) => void;
  refetchData: () => void;
  uploadFiles: (path: string | null, bucket: string) => void;
  createEmptyFolder: (args: {
    path: string | null;
    bucket: string;
    newFolderName?: string;
    silent?: boolean;
  }) => void;
  setSelectedItems: (selectedItems: DashboardItem[]) => void;
};

type DashboardContextValues = {
  currentTab: DashboardTab | null;
  searchValue: string;
  folderPath: string | null | undefined;
  folderBucket: string | null | undefined;
  sortAsc: boolean;
  sortType: DashboardSortType;
  filter: DashboardFilter;
  displayedDashboardItems: DashboardItem<
    ResourceMetadata | SharedByMeMetadata | SharedWithMeMetadata
  >[];
  loadingDashboard: boolean;
  selectedItems: DashboardItem[];
};

export const DashboardContext = createContext<
  DashboardContextActions & DashboardContextValues
>({} as DashboardContextActions & DashboardContextValues);
