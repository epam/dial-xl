import { Button } from 'antd';
import classNames from 'classnames';
import { useEffect } from 'react';

import Icon from '@ant-design/icons';
import { primaryButtonClasses, QGLogo } from '@frontend/common/lib';

import { useUIStore } from '../store';

export function NotFoundPage() {
  const setLoading = useUIStore((s) => s.setLoading);

  useEffect(() => {
    setLoading(false);
  }, [setLoading]);

  return (
    <div className="size-full flex flex-col items-center pt-[15dvh]">
      <div className="flex flex-col gap-7 items-center p-3">
        <Icon className="w-[48px]" component={() => <QGLogo />} />
        <div className="flex flex-col gap-3 items-center">
          <h1 className="text-5xl">404</h1>
          <span className="text-lg">
            The page you are trying to open was not found
          </span>
        </div>
        <Button className={classNames(primaryButtonClasses)} href={'/'}>
          Go to My files
        </Button>
      </div>
    </div>
  );
}
