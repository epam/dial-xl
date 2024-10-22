import { Dropdown, MenuProps, Modal } from 'antd';
import cx from 'classnames';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { toast } from 'react-toastify';

import Icon from '@ant-design/icons';
import {
  ChevronDown,
  getDropdownItem,
  LogoutIcon,
  SettingsIcon,
  UserAvatar,
} from '@frontend/common';
import { focusSpreadsheet } from '@frontend/spreadsheet';

import { ProjectContext } from '../../context';
import { Settings } from '../Modals';

type Props = {
  placement: 'dashboard' | 'project';
};

export function UserMenu({ placement }: Props) {
  const auth = useAuth();
  const { projectName, closeCurrentProject } = useContext(ProjectContext);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
    }
  }, [auth, closeCurrentProject, projectName]);

  useEffect(() => {
    if (!auth.error) return;

    toast.error(<p>{auth.error.message}</p>, {
      toastId: 'auth-error',
    });
  }, [auth]);

  const items: MenuProps['items'] = [
    getDropdownItem({
      key: 'settings',
      label: 'Settings',
      icon: (
        <Icon
          className="stroke-textSecondary"
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
          className="stroke-textSecondary"
          component={() => <LogoutIcon />}
        />
      ),
      onClick: () => logoutWithRedirect(),
    }),
  ];

  return (
    <>
      <Dropdown
        className="h-full min-w-[150px] flex items-center max-xl:min-w-[50px]"
        menu={{ items }}
      >
        <a href="/" onClick={(e) => e.preventDefault()}>
          <Icon
            className="stroke-textSecondary h-[18px] w-[18px]"
            component={() => <UserAvatar />}
          />
          <span
            className={cx(
              ' whitespace-nowrap overflow-hidden text-textPrimary text-ellipsis mx-2 select-none max-xl:hidden',
              {
                'text-sm': placement === 'dashboard',
                'text-[13px]': placement === 'project',
              }
            )}
          >
            {auth?.user
              ? auth?.user.profile.name || auth.user.profile.email || 'User'
              : 'User'}
          </span>
          <Icon
            className="text-textPrimary"
            component={() => <ChevronDown />}
          />
        </a>
      </Dropdown>
      <Modal
        afterClose={focusSpreadsheet}
        destroyOnClose={true}
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
