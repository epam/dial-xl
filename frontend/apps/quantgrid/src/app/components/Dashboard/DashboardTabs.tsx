import cx from 'classnames';
import { useContext } from 'react';
import { Link } from 'react-router-dom';

import {
  defaultTabClasses,
  notSelectedTabClasses,
  publicBucket,
  publicExamplesFolderRootPrefix,
  selectedTabClasses,
} from '@frontend/common';

import { DashboardContext } from '../../context';
import { routes } from '../../types';
import { DashboardTab } from '../../types/dashboard';
import { constructPath } from '../../utils';

type Tab = {
  id: DashboardTab;
  label: string;
};

const tabs: Tab[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'home', label: 'My files' },
  { id: 'sharedByMe', label: 'Shared by me' },
  { id: 'sharedWithMe', label: 'Shared with me' },
  { id: 'examples', label: 'Examples' },
];

export function DashboardTabs() {
  const { currentTab } = useContext(DashboardContext);

  const tabToRouteMap: { [key in DashboardTab]: string } = {
    home: routes.home,
    recent: routes.recent,
    sharedByMe: routes.sharedByMe,
    sharedWithMe: routes.sharedWithMe,
    examples: `${constructPath([
      routes.public,
      publicExamplesFolderRootPrefix,
    ])}?bucket=${publicBucket}`,
  };

  return (
    <div className="shrink-0 flex gap-2 md:gap-3 overflow-x-auto hidden-scrollbar">
      {tabs.map((tab) => (
        <Link
          className={cx(
            'h-[30px] md:h-9 px-3 md:px-5 text-sm md:text-base shrink-0',
            defaultTabClasses,
            currentTab === tab.id ? selectedTabClasses : notSelectedTabClasses
          )}
          id={tab.id}
          key={tab.id}
          to={tabToRouteMap?.[tab.id] || '/'}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
