import { Dropdown, MenuProps, Modal } from 'antd';
import cx from 'classnames';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { toast } from 'react-toastify';

import Icon from '@ant-design/icons';
import {
  ChevronDown,
  getDropdownDivider,
  getDropdownItem,
  LogoutIcon,
  SettingsIcon,
  UserAvatar,
} from '@frontend/common';

import { ColorSchema } from '../../common';
import { ProjectContext } from '../../context';
import { Settings } from '../Modals';

type Props = {
  placement: 'dashboard' | 'project';
  colorSchema?: ColorSchema;
};

export function UserMenu({ placement, colorSchema = 'default' }: Props) {
  const auth = useAuth();
  const { projectName, closeCurrentProject } = useContext(ProjectContext);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUserMenuOpened, setIsUserMenuOpened] = useState(false);

  const logoutWithRedirect = useCallback(async () => {
    if (projectName) {
      closeCurrentProject();
    }

    const isAuth0 = window.externalEnv.authAuthority?.includes('auth0');

    if (isAuth0) {
      // Remove all oidc tokens from local storage because auth.removeUser() can't do this properly
      for (const key in localStorage) {
        if (key.startsWith('oidc.')) {
          localStorage.removeItem(key);
        }
      }

      // Custom flow for auth0 logout
      const returnUrl = encodeURIComponent(window.location.origin);

      window.location.href = `${window.externalEnv.authAuthority}/v2/logout?client_id=${window.externalEnv.authClientId}&returnTo=${returnUrl}`;
    } else {
      await auth.revokeTokens();
      await auth.removeUser();
      await auth.signoutRedirect({
        post_logout_redirect_uri: window.location.href,
        id_token_hint: auth.user?.id_token,
      });
    }
  }, [auth, closeCurrentProject, projectName]);

  const userName = useMemo(() => {
    return auth?.user
      ? auth?.user.profile.name || auth.user.profile.email || 'User'
      : 'User';
  }, [auth.user]);

  useEffect(() => {
    if (!auth.error) return;

    toast.error(<p>{auth.error.message}</p>, {
      toastId: 'auth-error',
    });
  }, [auth]);

  const projectItems: MenuProps['items'] = [
    getDropdownItem({
      key: 'profile',
      label: userName,
      icon: (
        <Icon
          className="w-[18px] text-text-secondary"
          component={() => <UserAvatar />}
        />
      ),
    }),
    getDropdownDivider(),
  ];

  const items: MenuProps['items'] = [
    ...(placement === 'project' ? projectItems : []),
    getDropdownItem({
      key: 'settings',
      label: 'Settings',
      icon: (
        <Icon
          className="w-[18px] text-text-secondary"
          component={() => <SettingsIcon />}
        />
      ),
      onClick: () => setIsSettingsOpen(true),
    }),
    getDropdownItem({
      key: 'logout',
      label: 'Logout',
      icon: (
        <Icon
          className="text-text-secondary w-[18px]"
          component={() => <LogoutIcon />}
        />
      ),
      onClick: () => logoutWithRedirect(),
    }),
  ];

  return (
    <>
      <Dropdown
        align={{
          offset: [0, 12],
        }}
        className={cx('h-full flex items-center', {
          'xl:min-w-[150px] md:min-w-[50px]': placement === 'dashboard',
          'md:min-w-[36px]': placement === 'project',
        })}
        menu={{ items }}
        open={isUserMenuOpened}
        onOpenChange={setIsUserMenuOpened}
      >
        <a className="group" href="/" onClick={(e) => e.preventDefault()}>
          <Icon
            className={cx(
              'h-[18px] w-[18px]',
              colorSchema === 'read' && 'text-text-secondary',
              colorSchema === 'review' && 'text-text-inverted',
              colorSchema === 'default' && 'text-text-secondary'
            )}
            component={() => <UserAvatar />}
          />
          {placement === 'dashboard' && (
            <span className="hidden md:inline-block whitespace-nowrap overflow-hidden text-text-primary text-sm text-ellipsis mx-2 select-none max-xl:hidden">
              {userName}
            </span>
          )}
          <Icon
            className={cx(
              'hidden md:inline-block w-[18px] transition-all group-hover:text-text-accent-primary',
              isUserMenuOpened && 'rotate-180',
              colorSchema === 'read' && 'text-text-inverted',
              colorSchema === 'review' && 'text-text-inverted',
              colorSchema === 'default' && 'text-text-primary'
            )}
            component={() => <ChevronDown />}
          />
        </a>
      </Dropdown>
      <Modal
        destroyOnHidden={true}
        footer={null}
        open={isSettingsOpen}
        title="Settings"
        onCancel={() => setIsSettingsOpen(false)}
      >
        <Settings />
      </Modal>
    </>
  );
}
