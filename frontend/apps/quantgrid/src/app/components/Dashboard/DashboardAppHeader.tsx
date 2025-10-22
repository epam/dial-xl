import { Link } from 'react-router-dom';

import Icon from '@ant-design/icons';
import { DialTextLogo, QGLogo } from '@frontend/common';

import { logoSrcStorageKey } from '../../common';
import { routes } from '../../types';
import { UserMenu } from '../UserMenu';

export function DashboardAppHeader() {
  const logoSrc =
    localStorage.getItem(logoSrcStorageKey) ??
    window.externalEnv.defaultLogoUrl;

  return (
    <div className="flex justify-between items-center px-3 md:px-5 lg:px-[20%] h-10 md:h-[48px] bg-bg-layer-3 border-b border-stroke-tertiary">
      <div className="flex items-center">
        <Link className="flex items-center" to={routes.home}>
          {logoSrc ? (
            <img
              alt="custom logo"
              className="h-5 min-w-5 md:h-6 mg:min-w-6 object-center"
              src={logoSrc}
            />
          ) : (
            <>
              <Icon className="size-5 md:size-6" component={() => <QGLogo />} />
              <Icon
                className="ml-2 md:ml-2.5 text-text-primary h-2.5 w-[50px] md:h-4 md:w-[60px]"
                component={() => <DialTextLogo />}
              />
            </>
          )}
        </Link>
      </div>
      <div className="h-full">
        <UserMenu placement="dashboard" />
      </div>
    </div>
  );
}
