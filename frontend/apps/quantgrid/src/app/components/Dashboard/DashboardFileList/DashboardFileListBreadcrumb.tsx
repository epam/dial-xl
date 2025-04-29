import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { routeParams } from '../../../../AppRoutes';
import { DashboardTab } from '../../../common';
import { ApiContext, DashboardContext } from '../../../context';
import { Breadcrumb } from '../../../types/breadcrumbs';
import { getDashboardNavigateUrl } from '../../../utils';
import { Breadcrumbs } from '../../Breadcrumbs/Breadcrumbs';

const breadcrumbLabels: {
  [key in DashboardTab]?: string;
} = {
  home: 'Home',
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
    const mainBreadcrumbLabel = breadcrumbLabels[currentTab] || 'Home';
    const folderBucket = searchParams.get(routeParams.folderBucket) ?? '';

    setBreadcrumbs([
      {
        name: mainBreadcrumbLabel,
        path: '',
      },
      ...breadcrumbUrlParts.map((part, index) => ({
        name: decodeURIComponent(part),
        path: breadcrumbUrlParts.slice(0, index + 1).join('/'),
        bucket: folderBucket,
      })),
    ]);
  }, [currentTab, folderPath, searchParams, userBucket]);

  return (
    <div className="grow shrink overflow-hidden">
      <Breadcrumbs
        breadcrumbs={breadcrumbs}
        classNames="text-textPrimary text-[16px] grow"
        onSelectBreadcrumb={handleSelectBreadcrumb}
      />
    </div>
  );
}
