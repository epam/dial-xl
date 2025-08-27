import { Button, Dropdown, Input } from 'antd';
import cx from 'classnames';
import { useContext, useMemo } from 'react';

import {
  dialProjectFileExtension,
  inputClasses,
  primaryButtonClasses,
  SearchIcon,
} from '@frontend/common';

import { DashboardContext } from '../../context';
import { useDashboardCreateMenuItems } from './hooks';

export function DashboardSearchBar() {
  const { searchValue, search, displayedDashboardItems } =
    useContext(DashboardContext);

  const projects = useMemo(
    () =>
      displayedDashboardItems
        .filter((item) => item.name.endsWith(dialProjectFileExtension))
        .map((item) => item.name.slice(0, -dialProjectFileExtension.length)),
    [displayedDashboardItems]
  );

  const { dropdownItems } = useDashboardCreateMenuItems(projects);

  return (
    <div className="flex justify-between gap-2 md:gap-5">
      <Input
        className={cx(
          'ant-input-md text-sm md:text-base max-md:px-4 max-md:py-2.5 h-[38px] md:h-auto',
          inputClasses
        )}
        placeholder="Search project..."
        prefix={
          <div className="size-[18px] text-textSecondary shrink-0">
            <SearchIcon />
          </div>
        }
        value={searchValue}
        onChange={(e) => {
          search(e.target.value);
        }}
      />
      <Dropdown
        className="flex items-center"
        menu={{ items: dropdownItems }}
        trigger={['click']}
      >
        <Button
          className={cx(
            'h-[38px] md:h-11 px-5 text-base',
            primaryButtonClasses
          )}
        >
          New
        </Button>
      </Dropdown>
    </div>
  );
}
