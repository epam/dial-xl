import Fuse from 'fuse.js';

import { csvFileExtension, dialProjectFileExtension } from '@frontend/common';

import { routeParams, routes } from '../../AppRoutes';
import { DashboardFilter, DashboardSortType, DashboardTab } from '../common';
import { DashboardItem } from '../types/dashboard';

export const routeToTabMap: { [key: string]: DashboardTab } = {
  [routes.home]: 'home',
  [routes.recent]: 'recent',
  [routes.sharedByMe]: 'sharedByMe',
  [routes.sharedWithMe]: 'sharedWithMe',
  [routes.public]: 'examples',
};

export const tabToSingleRouteMap: { [key in DashboardTab]: string } = {
  home: routes.home,
  recent: routes.recent,
  sharedByMe: routes.sharedByMe,
  sharedWithMe: routes.sharedWithMe,
  examples: routes.public,
};

export const dashboardFuseOptions: Fuse.IFuseOptions<any> = {
  includeScore: true,
  shouldSort: true,
  includeMatches: true,
  threshold: 0.2,
  keys: [
    'name',
    'contentLength',
    'updatedAt',
    'parentPath',
  ] as DashboardSortType[],
};

export function filterDashboardItems(
  items: DashboardItem[],
  filter: DashboardFilter
) {
  if (filter === 'all') return items;

  return items.filter((i) => {
    const isFolder = i.nodeType === 'FOLDER';
    const isQG = i.name.endsWith(dialProjectFileExtension);
    const isCSV = i.name.endsWith(csvFileExtension);

    switch (filter) {
      case 'folders':
        return isFolder;
      case 'projects':
        return isQG;
      case 'files':
        return !isFolder && !isQG;
      case 'csvFiles':
        return !isFolder && !isQG && isCSV;
      default:
        return false;
    }
  });
}

export function sortDashboardItems(
  items: DashboardItem[],
  sortKey: DashboardSortType,
  sortAsc: boolean
): DashboardItem[] {
  return items.sort((a, b) => {
    const aIsFolder = a.nodeType === 'FOLDER';
    const bIsFolder = b.nodeType === 'FOLDER';

    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;

    if (aIsFolder && bIsFolder) {
      return sortAsc
        ? a['name'].localeCompare(b['name'])
        : b['name'].localeCompare(a['name']);
    }

    const aIsQG = a.name.endsWith(dialProjectFileExtension);
    const bIsQG = b.name.endsWith(dialProjectFileExtension);

    if (aIsQG && !bIsQG) return -1;
    if (!aIsQG && bIsQG) return 1;

    if (sortKey === 'name' || sortKey === 'parentPath') {
      const aValue = a[sortKey] ?? '';
      const bValue = b[sortKey] ?? '';

      return sortAsc
        ? aValue!.localeCompare(bValue!)
        : bValue!.localeCompare(aValue!);
    } else {
      const aValue = a[sortKey] ?? 0;
      const bValue = b[sortKey] ?? 0;

      return sortAsc ? aValue - bValue : bValue - aValue;
    }
  });
}

export const getDashboardNavigateUrl = (args: {
  folderPath: string | null | undefined;
  folderBucket: string | null | undefined;
  tab: DashboardTab;
}) => {
  if (!args.tab) return routes.home;

  const finalFolderBucket = args.folderBucket;
  const finalFolderPath = args.folderPath;

  const folderPathUrl = finalFolderPath ? `/${finalFolderPath}` : '';
  const searchParams = new URLSearchParams({
    ...(finalFolderBucket
      ? {
          [routeParams.folderBucket]: finalFolderBucket ?? '',
        }
      : undefined),
  });

  return `${tabToSingleRouteMap[args.tab as DashboardTab]}${folderPathUrl}${
    searchParams ? `?${searchParams}` : ''
  }`;
};
