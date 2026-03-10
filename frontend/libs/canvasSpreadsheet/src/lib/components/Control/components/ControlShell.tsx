import { Button, Input, Spin } from 'antd';
import cx from 'classnames';
import { ReactNode } from 'react';

import { inputClasses, secondaryButtonClasses } from '@frontend/common';

type ControlShellProps = {
  searchValue: string;
  onSearchChange: (v: string) => void;
  onApply: (reset: boolean) => void;
  isLoading: boolean;
  isEmpty: boolean;
  children: ReactNode;
};

export function ControlShell({
  searchValue,
  onSearchChange,
  onApply,
  isLoading,
  isEmpty,
  children,
}: ControlShellProps) {
  return (
    <div
      className="flex flex-col py-2 gap-2 overflow-hidden w-[220px] pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex gap-1 items-center">
        <Input
          className={cx(inputClasses)}
          placeholder="Value to search"
          value={searchValue}
          autoFocus
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => e.key !== 'Escape' && e.stopPropagation()}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[75px] w-full">
          <Spin />
        </div>
      ) : isEmpty ? (
        <span>No values to filter</span>
      ) : (
        children
      )}

      <div className="flex justify-start gap-2">
        <Button
          className={cx(
            'h-8 px-2 text-[13px] w-16 mt-4',
            secondaryButtonClasses,
          )}
          onClick={() => onApply(false)}
        >
          Apply
        </Button>
        <Button
          className={cx(
            'h-8 px-2 text-[13px] w-16 mt-4',
            secondaryButtonClasses,
          )}
          onClick={() => onApply(true)}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
