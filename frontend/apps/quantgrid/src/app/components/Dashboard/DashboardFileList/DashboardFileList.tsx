import { Popover, Spin } from 'antd';
import classNames from 'classnames';
import { format } from 'date-fns';
import { useContext, useMemo } from 'react';

import {
  dialProjectFileExtension,
  formatBytes,
  MetadataNodeType,
} from '@frontend/common';

import { DashboardContext } from '../../../context';
import { DashboardItem, DashboardListColumn } from '../../../types/dashboard';
import { normalizePermissionsLabels } from '../../../utils';
import { Chip } from '../../Chip';
import { DashboardFileListBreadcrumb } from './DashboardFileListBreadcrumb';
import { DashboardFileListFilter } from './DashboardFileListFilter';
import { DashboardFileListHeader } from './DashboardFileListHeader';
import { DashboardFileListItems } from './DashboardFileListItems';
import { DashboardFileListSelectionToolbar } from './DashboardFileListSelectionToolbar';

export function DashboardFileList() {
  const {
    sortChange,
    sortAsc,
    currentTab,
    loadingDashboard,
    folderPath,
    sortType,
    selectedItems,
  } = useContext(DashboardContext);

  const columns: DashboardListColumn[] = useMemo(() => {
    const nameCol: DashboardListColumn = {
      title: 'Name',
      sortKey: 'name',
      classNames: 'min-w-[200px] md:min-w-[60%] pl-4 pr-2',
      formatValue: (value: DashboardItem) =>
        value.nodeType === MetadataNodeType.ITEM
          ? value.name.replace(dialProjectFileExtension, '')
          : value.name,
    };

    const ownerCol: DashboardListColumn = {
      title: 'Owner',
      sortKey: 'owner',
      classNames: 'min-w-[100px] md:min-w-[20%] pr-2',
      formatValue: (value) => value.owner ?? '-',
    };

    const updatedAtCol: DashboardListColumn = {
      title: currentTab === 'recent' ? 'Opened at' : 'Modify Date',
      sortKey: 'updatedAt',
      classNames: 'min-w-[100px] md:min-w-[20%] pr-2',
      formatValue: (value) =>
        value.nodeType === MetadataNodeType.ITEM &&
        'updatedAt' in value &&
        value.updatedAt
          ? format(value.updatedAt, 'MMM dd, yyyy')
          : '-',
    };

    const sizeCol: DashboardListColumn = {
      title: 'Size',
      sortKey: 'contentLength',
      classNames: 'min-w-[100px] md:min-w-[20%] pr-2',
      formatValue: (value: DashboardItem) =>
        'contentLength' in value && value.contentLength
          ? formatBytes(value.contentLength)
          : '-',
    };

    const sharedWithMeCol: DashboardListColumn = {
      title: 'Shared by',
      sortKey: 'sharedBy',
      classNames: 'min-w-[100px] md:min-w-[20%] pr-2',
      formatValue: (value: DashboardItem) => {
        if ('sharedBy' in value) {
          const sharedByUsers = value.sharedBy ?? [];
          const sharedBy = sharedByUsers[sharedByUsers.length - 1]?.user;

          return sharedBy ?? '-';
        }

        return '-';
      },
    };

    const sharedWithMeAtCol: DashboardListColumn = {
      title: 'Shared at',
      sortKey: 'sharedAt',
      sortFn: (a, b) => {
        const aSharedByUsers = (a as any).sharedBy ?? [];
        const bSharedByUsers = (b as any).sharedBy ?? [];

        const aValue =
          aSharedByUsers[aSharedByUsers.length - 1]?.acceptedAt ??
          Number.MAX_SAFE_INTEGER;
        const bValue =
          bSharedByUsers[bSharedByUsers.length - 1]?.acceptedAt ??
          Number.MAX_SAFE_INTEGER;

        return aValue - bValue;
      },
      classNames: 'min-w-[100px] md:min-w-[20%] pr-2',
      formatValue: (value: DashboardItem) => {
        if ('sharedBy' in value) {
          const sharedByUsers = value.sharedBy ?? [];
          const sharedAt = sharedByUsers[sharedByUsers.length - 1]?.acceptedAt;

          return sharedAt ? format(sharedAt, 'MMM dd, yyyy') : '-';
        }

        return '-';
      },
    };

    const sharedByMeCol: DashboardListColumn = {
      title: 'Shared with',
      sortKey: 'sharedWith',
      classNames: 'min-w-[100px] md:min-w-[20%] pr-2',
      formatValue: (value: DashboardItem) => {
        if ('sharedWith' in value) {
          const sharedWith = value.sharedWith ?? [];

          return sharedWith.length === 0 ? (
            '-'
          ) : (
            <span className="inline-flex items-center gap-1">
              <Popover
                content={
                  <span className="flex flex-col gap-2">
                    {sharedWith.map((user) => (
                      <span className="flex items-center gap-2 text-text-primary">
                        <div className="flex gap-1 items-center">
                          {normalizePermissionsLabels(user.permissions).map(
                            (permission) => (
                              <Chip
                                className={classNames(
                                  'text-text-inverted min-w-10 text-center',
                                  {
                                    'bg-bg-accent-primary':
                                      permission === 'Edit',
                                    'bg-bg-accent-secondary':
                                      permission === 'View',
                                    'bg-bg-accent-tertiary':
                                      permission === 'Share',
                                  }
                                )}
                                key={permission}
                                label={permission}
                              />
                            )
                          )}
                        </div>
                        {user.user}
                      </span>
                    ))}
                  </span>
                }
                destroyOnHidden={true}
                trigger={['hover', 'click']}
              >
                <span className="bg-bg-layer-4 rounded-md py-0.5 px-2 inline-flex items-center">
                  {sharedWith.length} user{sharedWith.length > 1 ? 's' : ''}
                </span>
              </Popover>
            </span>
          );
        }

        return '-';
      },
    };

    if (currentTab === 'recent') {
      return [nameCol, ownerCol, updatedAtCol];
    } else if (currentTab === 'sharedByMe' && !folderPath) {
      return [nameCol, sharedByMeCol, updatedAtCol];
    } else if (currentTab === 'sharedWithMe' && !folderPath) {
      return [nameCol, sharedWithMeCol, sharedWithMeAtCol];
    }

    return [nameCol, updatedAtCol, sizeCol];
  }, [currentTab, folderPath]);

  return (
    <div className="h-full bg-bg-layer-3 border border-stroke-tertiary overflow-y-hidden">
      <div className="h-full flex flex-col overflow-y-hidden">
        <div className="h-12 flex justify-between items-center py-3 md:py-4 px-3 md:px-4 border-b border-b-stroke-tertiary">
          {selectedItems.length === 0 ? (
            <>
              <DashboardFileListBreadcrumb />
              <DashboardFileListFilter />
            </>
          ) : (
            <DashboardFileListSelectionToolbar />
          )}
        </div>
        <div className="thin-scrollbar overflow-y-auto overflow-x-auto md:overflow-x-hidden grow flex flex-col">
          {loadingDashboard ? (
            <div className="size-full flex items-center justify-center">
              <Spin className="z-50" size="large"></Spin>
            </div>
          ) : (
            <>
              <div className="sticky z-10 bg-bg-layer-2 top-0 border-b border-b-stroke-tertiary flex md:w-full min-w-[400px] md:min-w-full">
                <div className="flex mr-6 h-[30px] grow">
                  {columns.map((item) => (
                    <div
                      className={classNames(
                        'shrink-0 md:shrink-1 flex items-center',
                        item.classNames
                      )}
                      key={item.sortKey}
                    >
                      <DashboardFileListHeader
                        isSort={sortType === item.sortKey}
                        sortAsc={sortAsc}
                        title={item.title}
                        onClick={() => sortChange(item.sortKey, item.sortFn)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <DashboardFileListItems columns={columns} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
