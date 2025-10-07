import { Checkbox, Tooltip } from 'antd';
import classNames from 'classnames';

import { MenuItem, MenuItemProps } from '../types';

export function getDropdownMenuKey<T extends Record<string, any>>(
  action: string,
  data?: T
): string {
  return JSON.stringify({
    action,
    data,
  });
}

export function getDropdownItem(props: MenuItemProps): MenuItem {
  const {
    label,
    key,
    icon,
    children,
    disabled,
    tooltip,
    type,
    shortcut,
    stopPropagationOnClick,
    onClick,
  } = props;

  let buildLabel;

  if (shortcut) {
    buildLabel = (
      <button
        className="group flex justify-between items-center py-1 px-3 w-full"
        data-label={label}
        data-qa={key}
        disabled={disabled}
        onClick={(e) => {
          if (disabled) return;

          onClick?.();

          if (stopPropagationOnClick) {
            e.stopPropagation();
          }
        }}
      >
        <div className="flex gap-2 items-center">
          {icon && <span className="size-[18px] leading-none">{icon}</span>}
          <span className="ml-0!">{label}</span>
        </div>
        <span className="hidden md:inline ml-5 text-xs text-gray-400 leading-none">
          {shortcut}
        </span>
      </button>
    );
  } else {
    buildLabel = (
      <button
        {...(stopPropagationOnClick
          ? { 'data-stop-propagation': stopPropagationOnClick }
          : {})}
        className="flex items-center py-1 px-3 gap-2 group size-full"
        data-label={label}
        data-qa={key}
        disabled={disabled}
        onClick={(e) => {
          if (disabled) return;

          onClick?.();

          if (stopPropagationOnClick) {
            e.stopPropagation();
          }
        }}
      >
        {icon && <span className="size-[18px] leading-none">{icon}</span>}
        {label}
      </button>
    );
  }

  buildLabel = tooltip ? (
    <Tooltip
      className={classNames(disabled && 'hover:cursor-not-allowed')}
      title={tooltip}
      destroyOnHidden
    >
      {buildLabel}
    </Tooltip>
  ) : (
    buildLabel
  );

  return { key, children, label: buildLabel, disabled, type } as MenuItem;
}

export function getCheckboxDropdownSubmenuItem(
  props: MenuItemProps,
  checked: boolean
): MenuItem {
  const { label, key } = props;

  const buildLabel = (
    <div
      className="flex items-center py-1 px-3"
      onClick={(e) => e.preventDefault()}
    >
      <Checkbox
        checked={checked}
        onClick={(e) => {
          e.preventDefault();
        }}
      >
        {label}
      </Checkbox>
    </div>
  );

  return { key, label: buildLabel } as MenuItem;
}

export function getDropdownDivider(): MenuItem {
  return { type: 'divider' };
}
