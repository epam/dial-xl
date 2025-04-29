import Icon from '@ant-design/icons';
import { DialTextLogo, QGLogo } from '@frontend/common';

import { UserMenu } from '../UserMenu';

export function DashboardAppHeader() {
  return (
    <div className="flex justify-between items-center px-5 lg:px-[20%] min-h-[48px] bg-bgLayer3 border-b border-strokeTertiary">
      <div className="flex items-center">
        <Icon className="h-6 w-6" component={() => <QGLogo />} />
        <Icon
          className="ml-2.5 text-textPrimary h-4 w-[60px]"
          component={() => <DialTextLogo />}
        />
      </div>
      <div className="h-full">
        <UserMenu placement="dashboard" />
      </div>
    </div>
  );
}
