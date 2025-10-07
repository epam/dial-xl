import { Button, Dropdown, Input, InputRef } from 'antd';
import cx from 'classnames';
import { useContext, useEffect, useMemo, useRef } from 'react';

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
  const inputRef = useRef<InputRef | null>(null);

  const projects = useMemo(
    () =>
      displayedDashboardItems
        .filter((item) => item.name.endsWith(dialProjectFileExtension))
        .map((item) => item.name.slice(0, -dialProjectFileExtension.length)),
    [displayedDashboardItems]
  );

  const { dropdownItems } = useDashboardCreateMenuItems(projects);

  useEffect(() => {
    const onSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onSearch);

    return () => {
      document.removeEventListener('keydown', onSearch);
    };
  });

  return (
    <div className="flex justify-between gap-2 md:gap-5">
      <Input
        className={cx(
          'ant-input-md text-sm md:text-base max-md:px-4 max-md:py-2.5 h-[38px] md:h-auto',
          inputClasses
        )}
        placeholder="Search project..."
        prefix={
          <div className="size-[18px] text-text-secondary shrink-0">
            <SearchIcon />
          </div>
        }
        ref={inputRef}
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
