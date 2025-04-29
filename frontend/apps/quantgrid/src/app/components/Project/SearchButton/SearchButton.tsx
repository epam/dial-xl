import { Button } from 'antd';
import cx from 'classnames';
import { useContext } from 'react';

import Icon from '@ant-design/icons';
import { SearchIcon, Shortcut, shortcutApi } from '@frontend/common';

import { SearchWindowContext } from '../../../context';

export function SearchButton() {
  const { openSearchWindow } = useContext(SearchWindowContext);

  return (
    <Button
      className={cx(
        'min-w-[220px] xl:min-w-[220px] flex items-center text-[13px] !text-textSecondary border-strokeTertiary rounded-[3px] !bg-bgLayer4 h-[28px] py-0 leading-4',
        '!shadow-none hover:!border-strokeTertiary hover:!bg-bgLayer4 hover:!text-textSecondary',
        'focus:!outline-0 focus-visible:!outline-0 focus:!border focus:!border-strokeTertiary focus:!bg-bgLayer4'
      )}
      icon={
        <Icon
          className="text-textSecondary w-[18px]"
          component={() => <SearchIcon />}
        />
      }
      onClick={openSearchWindow}
    >
      Type {shortcutApi.getLabel(Shortcut.SearchWindow)} to search
    </Button>
  );
}
