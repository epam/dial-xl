import { Dropdown, MenuProps, Modal } from 'antd';
import cx from 'classnames';
import { useEffect, useMemo, useState } from 'react';
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
import { useLogout } from '../../hooks';
import { Settings } from '../Modals';

type Props = {
  placement: 'dashboard' | 'project';
  colorSchema?: ColorSchema;
};

const userMenuPath = ['UserMenu'];

export function UserMenu({ placement, colorSchema = 'default' }: Props) {
  const auth = useAuth();
  const { logoutWithRedirect } = useLogout();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUserMenuOpened, setIsUserMenuOpened] = useState(false);

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

  const projectItems: MenuProps['items'] = useMemo(() => {
    return [
      getDropdownItem({
        key: 'profile',
        fullPath: [...userMenuPath, 'Profile'],
        label: userName,
        icon: auth.user?.profile?.picture ? (
          <img
            alt="User"
            className="size-[18px] rounded"
            src={auth.user.profile.picture}
          />
        ) : (
          <Icon
            className="w-[18px] text-text-secondary"
            component={() => <UserAvatar />}
          />
        ),
      }),
      getDropdownDivider(),
    ];
  }, [auth.user?.profile.picture, userName]);

  const items: MenuProps['items'] = [
    ...(placement === 'project' ? projectItems : []),
    getDropdownItem({
      key: 'settings',
      fullPath: [...userMenuPath, 'Settings'],
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
      fullPath: [...userMenuPath, 'Logout'],
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
        menu={{ items }}
        open={isUserMenuOpened}
        onOpenChange={setIsUserMenuOpened}
      >
        <a
          className={cx('group h-full flex items-center', {
            'xl:min-w-[150px] md:min-w-[50px]': placement === 'dashboard',
            'md:min-w-[36px]': placement === 'project',
          })}
          href="/"
          onClick={(e) => e.preventDefault()}
        >
          {auth.user?.profile?.picture ? (
            <img
              alt="User"
              className="size-5 rounded"
              src={auth.user.profile.picture}
            />
          ) : (
            <Icon
              className={cx(
                'size-[18px]',
                colorSchema === 'read' && 'text-text-secondary',
                colorSchema === 'review' && 'text-text-inverted',
                colorSchema === 'default' && 'text-text-secondary',
              )}
              component={() => <UserAvatar />}
            />
          )}

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
              colorSchema === 'default' && 'text-text-primary',
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
