import { Button } from 'antd';
import classNames from 'classnames';
import { Fragment, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import Icon from '@ant-design/icons';
import { primaryButtonClasses, QGLogo } from '@frontend/common/lib';

import { useUIStore } from '../store';

export const ErrorPage = () => {
  const [searchParams] = useSearchParams();
  const setLoading = useUIStore((s) => s.setLoading);

  useEffect(() => {
    setLoading(false);

    // eslint-disable-next-line no-console
    console.error('Error', {
      ...Array.from(searchParams.entries()).reduce((acc, [key, value]) => {
        acc[key] = value;

        return acc;
      }, {} as Record<string, any>),
    });
  }, [searchParams, setLoading]);

  return (
    <div className="size-full flex flex-col items-center pt-[15dvh] max-w-dvw">
      <div className="flex flex-col gap-7 items-center p-3 max-w-full">
        <Icon className="w-[48px]" component={() => <QGLogo />} />
        <div className="flex flex-col gap-3 items-center">
          <h1 className="text-5xl">Error</h1>
          <span className="text-lg">Something went wrong.</span>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <span className="p-3 bg-bg-layer-2 break-words max-w-full">
            {Array.from(searchParams.entries()).map(([key, value]) => (
              <Fragment key={key}>
                {key}: <span className="bg-bg-layer-4">{value}</span>
                <br />
              </Fragment>
            ))}
          </span>
        )}
        <Button
          className={classNames(primaryButtonClasses)}
          href={searchParams.get('redirectTo') ?? '/'}
        >
          Try again
        </Button>
      </div>
    </div>
  );
};
