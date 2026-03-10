import { Dropdown } from 'antd';
import { useContext, useMemo } from 'react';

import { dialProjectFileExtension } from '@frontend/common';

import { DashboardContext } from '../../../context';
import { DashboardListColumn } from '../../../types/dashboard';
import { useDashboardCreateMenuItems } from '../hooks';
import { EmptySearchResults } from './EmptySearchResults';
import { FileListErrorState } from './FileListErrorState';
import { FileListItem } from './FileListItem';

interface Props {
  columns: DashboardListColumn[];
  onUpload: (files: FileList) => void;
}

export const DashboardFileListItems = ({ columns }: Props) => {
  const {
    displayedDashboardItems,
    loadingDashboard,
    loadingError,
    refetchData,
  } = useContext(DashboardContext);

  const showNotFoundNotification = useMemo(
    () =>
      !loadingDashboard &&
      !loadingError &&
      displayedDashboardItems.length === 0,
    [displayedDashboardItems.length, loadingDashboard, loadingError],
  );

  const showErrorState = useMemo(
    () => !loadingDashboard && loadingError,
    [loadingDashboard, loadingError],
  );

  const projects = useMemo(
    () =>
      displayedDashboardItems
        .filter((item) => item.name.endsWith(dialProjectFileExtension))
        .map((item) => item.name.slice(0, -dialProjectFileExtension.length)),
    [displayedDashboardItems],
  );

  const { dropdownItems } = useDashboardCreateMenuItems(projects);

  return (
    <>
      {!showErrorState &&
        displayedDashboardItems.map((item) => (
          <FileListItem
            columns={columns}
            item={item}
            key={`${item.bucket}${item.parentPath ? item.parentPath : ''}${
              item.name
            }`}
          />
        ))}
      <Dropdown menu={{ items: dropdownItems }} trigger={['contextMenu']}>
        <div className="flex flex-col grow">
          {showErrorState && loadingError && (
            <FileListErrorState error={loadingError} onRetry={refetchData} />
          )}
          {showNotFoundNotification && <EmptySearchResults />}
        </div>
      </Dropdown>
    </>
  );
};
