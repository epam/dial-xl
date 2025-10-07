import { ReactNode } from 'react';

import {
  ResourceMetadata,
  SharedByMeMetadata,
  SharedWithMeMetadata,
} from '@frontend/common';

export type DashboardItem<
  T = ResourceMetadata | SharedWithMeMetadata | SharedByMeMetadata
> = T & {
  isSharedByMe?: boolean;
  owner?: 'Me' | 'Public' | 'Shared with me' | string;
};

export type DashboardSortType =
  | keyof (ResourceMetadata &
      SharedWithMeMetadata &
      SharedByMeMetadata & {
        isSharedByMe?: boolean;
        owner?: string;
      })
  | string; // It allows to have custom sort type with sort fn provided

export type DashboardSortFn = (a: DashboardItem, b: DashboardItem) => number;

export type DashboardTab =
  | 'recent'
  | 'home'
  | 'sharedByMe'
  | 'sharedWithMe'
  | 'examples';

export type DashboardFilter =
  | 'all'
  | 'folders'
  | 'projects'
  | 'files'
  | 'csvFiles';

export interface DashboardListColumn {
  title: string;
  sortKey: DashboardSortType;
  sortFn?: DashboardSortFn;
  classNames: string;
  formatValue: (
    value: DashboardItem<
      ResourceMetadata | SharedByMeMetadata | SharedWithMeMetadata
    >
  ) => ReactNode;
}
