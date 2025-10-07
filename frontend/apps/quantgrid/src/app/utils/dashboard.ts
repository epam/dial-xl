import Fuse from 'fuse.js';

import {
  csvFileExtension,
  dialProjectFileExtension,
  MetadataNodeType,
} from '@frontend/common';

import { routeParams, routes } from '../types';
import {
  DashboardFilter,
  DashboardItem,
  DashboardSortType,
  DashboardTab,
} from '../types/dashboard';

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
    const isFolder = i.nodeType === MetadataNodeType.FOLDER;
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
  sortFn: ((a: DashboardItem, b: DashboardItem) => number) | undefined,
  sortAsc: boolean
): DashboardItem[] {
  return items.sort((a, b) => {
    const aIsFolder = a.nodeType === MetadataNodeType.FOLDER;
    const bIsFolder = b.nodeType === MetadataNodeType.FOLDER;

    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;

    const aIsQG =
      a.nodeType === MetadataNodeType.ITEM &&
      a.name.endsWith(dialProjectFileExtension);
    const bIsQG =
      b.nodeType === MetadataNodeType.ITEM &&
      b.name.endsWith(dialProjectFileExtension);

    if (aIsQG && !bIsQG) return -1;
    if (!aIsQG && bIsQG) return 1;

    // Use defined sort fn for this sorting
    if (sortFn) {
      return sortFn(a, b) * (sortAsc ? 1 : -1);
    }

    const aValue = (a as any)[sortKey];
    const bValue = (b as any)[sortKey];

    if (aValue && !bValue) return -1 * (sortAsc ? 1 : -1);
    if (!aValue && bValue) return 1 * (sortAsc ? 1 : -1);

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortAsc
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortAsc ? aValue - bValue : bValue - aValue;
    } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
      return sortAsc
        ? (aValue ? 1 : 0) - (bValue ? 1 : 0)
        : (bValue ? 1 : 0) - (aValue ? 1 : 0);
    } else if (Array.isArray(aValue) && Array.isArray(bValue)) {
      return sortAsc
        ? aValue.length - bValue.length
        : bValue.length - aValue.length;
    }

    return -1;
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
