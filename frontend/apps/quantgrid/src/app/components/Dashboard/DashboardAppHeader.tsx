import { Link } from 'react-router-dom';

import Icon from '@ant-design/icons';
import { DialTextLogo, QGLogo } from '@frontend/common';

import { routes } from '../../types';
import { UserMenu } from '../UserMenu';

export function DashboardAppHeader() {
  return (
    <div className="flex justify-between items-center px-3 md:px-5 lg:px-[20%] h-10 md:h-[48px] bg-bgLayer3 border-b border-strokeTertiary">
      <div className="flex items-center">
        <Link to={routes.home}>
          <Icon className="size-5 md:size-6" component={() => <QGLogo />} />
          <Icon
            className="ml-2 md:ml-2.5 text-textPrimary h-2.5 w-[50px] md:h-4 md:w-[60px]"
            component={() => <DialTextLogo />}
          />
        </Link>
      </div>
      <div className="h-full">
        <UserMenu placement="dashboard" />
      </div>
    </div>
  );
}
