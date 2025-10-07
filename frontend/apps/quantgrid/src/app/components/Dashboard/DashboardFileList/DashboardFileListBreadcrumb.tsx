import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  projectFolderAppdata,
  projectFoldersRootPrefix,
} from '@frontend/common';

import { ApiContext, DashboardContext } from '../../../context';
import { routeParams } from '../../../types';
import { Breadcrumb } from '../../../types/breadcrumbs';
import { DashboardTab } from '../../../types/dashboard';
import { getDashboardNavigateUrl } from '../../../utils';
import { Breadcrumbs } from '../../Breadcrumbs/Breadcrumbs';

const breadcrumbLabels: {
  [key in DashboardTab]?: string;
} = {
  home: 'My Files',
  recent: 'Recent',
  sharedByMe: 'Shared by me',
  sharedWithMe: 'Shared with me',
  examples: 'Public',
};

export function DashboardFileListBreadcrumb() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userBucket } = useContext(ApiContext);
  const { folderPath, currentTab } = useContext(DashboardContext);

  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);

  const handleSelectBreadcrumb = useCallback(
    (breadcrumb: Breadcrumb, index: number) => {
      if (!currentTab) return;

      navigate(
        getDashboardNavigateUrl({
          folderPath: index === 0 ? null : breadcrumb.path,
          folderBucket: index === 0 ? null : breadcrumb.bucket,
          tab: currentTab,
        })
      );
    },
    [currentTab, navigate]
  );

  useEffect(() => {
    if (!currentTab) return;

    const breadcrumbUrlParts = folderPath?.split('/').filter(Boolean) ?? [];
    const mainBreadcrumbLabel = breadcrumbLabels[currentTab] || 'My Files';
    const folderBucket = searchParams.get(routeParams.folderBucket) ?? '';
    let updatedBreadcrumbs: Breadcrumb[] = [
      {
        name: mainBreadcrumbLabel,
        path: '',
      },
      ...breadcrumbUrlParts.map((part, index) => ({
        name: decodeURIComponent(part),
        path: breadcrumbUrlParts.slice(0, index + 1).join('/'),
        bucket: folderBucket,
      })),
    ];

    // Do not show appdata > xl breadcrumbs in shared tabs
    if (
      [breadcrumbLabels.sharedByMe, breadcrumbLabels.sharedWithMe].includes(
        mainBreadcrumbLabel
      )
    ) {
      updatedBreadcrumbs = updatedBreadcrumbs.filter((b) => {
        return (
          b.path !== projectFolderAppdata && b.path !== projectFoldersRootPrefix
        );
      });
    }

    setBreadcrumbs(updatedBreadcrumbs);
  }, [currentTab, folderPath, searchParams, userBucket]);

  return (
    <div className="grow shrink overflow-hidden">
      <Breadcrumbs
        breadcrumbs={breadcrumbs}
        classNames="text-text-primary text-[16px] grow"
        onSelectBreadcrumb={handleSelectBreadcrumb}
      />
    </div>
  );
}
