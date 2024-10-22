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

import { routes } from '../../../AppRoutes';
import { DashboardTab } from '../../common';
import { DashboardContext } from '../../context';
import { constructPath } from '../../utils';

type Tab = {
  id: DashboardTab;
  label: string;
};

const tabs: Tab[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'home', label: 'Home' },
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
    <div className="flex mt-5 mb-4">
      {tabs.map((tab, index) => (
        <Link
          className={cx(
            'h-9 px-5 text-base',
            index !== 0 && 'ml-3',
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
