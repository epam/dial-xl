import { Button, Spin } from 'antd';
import classNames from 'classnames';
import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import Icon from '@ant-design/icons';
import { primaryButtonClasses, QGLogo } from '@frontend/common/lib';

import { useUIStore } from '../store';
import { routeParams, routes } from '../types';
import { getProjectNavigateUrl } from '../utils';

export const LoginRedirectingPage = (
  { isAutoRedirect = true }: { isAutoRedirect?: boolean } = {
    isAutoRedirect: true,
  }
) => {
  const navigate = useNavigate();
  const { projectName: urlProjectName, sheetName: urlProjectSheetName } =
    useParams();
  const [searchParams] = useSearchParams();
  const setLoading = useUIStore((s) => s.setLoading);
  const auth = useAuth();

  useEffect(() => {
    setLoading(false);
  }, [setLoading]);

  useEffect(() => {
    if (!isAutoRedirect) {
      auth.signinRedirect({
        redirect_uri: window.location.origin,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const error = searchParams.get('error');

    const urlProjectBucket = searchParams.get(routeParams.projectBucket);

    if (error) {
      const errorSearchParams = new URLSearchParams(searchParams);

      if (urlProjectBucket && urlProjectName) {
        errorSearchParams.set(
          'redirectTo',
          window.location.origin +
            getProjectNavigateUrl({
              projectPath: searchParams.get(routeParams.projectPath) ?? '',
              projectBucket: urlProjectBucket,
              projectName: urlProjectName,
              projectSheetName: urlProjectSheetName,
            })
        );
      } else {
        errorSearchParams.set(
          'redirectTo',
          window.location.origin + window.location.pathname
        );
      }

      navigate(routes.error + '?' + errorSearchParams.toString());
    }
  }, [navigate, searchParams, urlProjectName, urlProjectSheetName]);

  return (
    <div className="size-full flex flex-col items-center pt-[15dvh]">
      <div className="flex flex-col gap-5 items-center">
        <Icon className="w-[36px]" component={() => <QGLogo />} />
        <div className="flex flex-col gap-3 items-center text-center">
          <h1 className="text-2xl">Redirecting</h1>
          <span>
            Please wait a while. You&apos;ve being redirected to login page
          </span>
          <div className="flex flex-col items-center gap-2">
            <span className="text-text-secondary">
              If not redirected, please press button below
            </span>
            <Button
              className={classNames(primaryButtonClasses)}
              href={routes.home}
            >
              Go to home page
            </Button>
          </div>
        </div>
        <Spin size="large" />
      </div>
    </div>
  );
};
