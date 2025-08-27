import { Spin } from 'antd';
import { useContext } from 'react';

import { DashboardContext } from '../../../context';
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
    searchValue,
    selectedItems,
  } = useContext(DashboardContext);

  const isSimplifiedColumns =
    currentTab === 'recent' || (currentTab === 'sharedByMe' && !folderPath);

  const isSearchColumns = searchValue !== '';

  return (
    <div className="h-full bg-bgLayer3 border border-strokeTertiary overflow-y-hidden">
      <div className="h-full flex flex-col overflow-y-hidden">
        <div className="h-12 flex justify-between items-center py-3 md:py-4 px-3 md:px-4 border-b border-b-strokeTertiary">
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
              <div className="sticky z-10 bg-bgLayer2 top-0 border-b border-b-strokeTertiary flex md:w-full min-w-[400px] md:min-w-full">
                <div className="flex mr-6 h-[30px] grow">
                  <div className="min-w-[200px] shrink-0 md:shrink-1 md:min-w-[60%] pl-4 flex items-center">
                    <DashboardFileListHeader
                      isSort={sortType === 'name'}
                      sortAsc={sortAsc}
                      title="Name"
                      onClick={() => sortChange('name')}
                    />
                  </div>
                  {(isSimplifiedColumns || isSearchColumns) && (
                    <div className="min-w-[100px] shrink-0 md:shrink-1 md:min-w-[20%] pr-2 flex items-center">
                      <DashboardFileListHeader
                        isSort={sortType === 'parentPath'}
                        sortAsc={sortAsc}
                        title="Location"
                        onClick={() => sortChange('parentPath')}
                      />
                    </div>
                  )}
                  <div className="min-w-[100px] shrink-0 md:shrink-1 md:min-w-[20%] pr-2 flex items-center">
                    <DashboardFileListHeader
                      isSort={sortType === 'updatedAt'}
                      sortAsc={sortAsc}
                      title={
                        currentTab === 'recent' ? 'Opened at' : 'Modify Date'
                      }
                      onClick={() => sortChange('updatedAt')}
                    />
                  </div>
                  {!isSimplifiedColumns && !isSearchColumns && (
                    <div className="min-w-[100px] shrink-0 md:shrink-1 md:min-w-[20%] pr-2 flex items-center">
                      <DashboardFileListHeader
                        isSort={sortType === 'contentLength'}
                        sortAsc={sortAsc}
                        title="Size"
                        onClick={() => sortChange('contentLength')}
                      />
                    </div>
                  )}
                </div>
              </div>
              <DashboardFileListItems />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
