import { Checkbox, Tooltip } from 'antd';
import classNames from 'classnames';

import { MenuItem, MenuItemProps } from '../types';

export function getDropdownMenuKey<T extends Record<string, any>>(
  action: string,
  data?: T,
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
    fullPath,
    icon,
    children,
    disabled,
    tooltip,
    type,
    shortcut,
    stopPropagationOnClick,
    isCustomContent,
    onClick,
  } = props;

  const stopPropagationOnClickResult =
    stopPropagationOnClick || (!!children && children?.length > 0);

  const dataQa = fullPath.join('-');

  let buildLabel;
  const ItemTag = stopPropagationOnClick ? 'div' : 'button';

  if (shortcut) {
    buildLabel = (
      <ItemTag
        // We need to use the xl-dropdown class here to ensure that the dropdown item is styled correctly when it is inside a submenu title
        className={classNames(
          'xl-dropdown group flex justify-between items-center w-full',
          isCustomContent ? 'p-0' : 'py-0.5 px-3',
        )}
        data-label={label}
        data-qa={dataQa}
        disabled={disabled}
        onClick={(e) => {
          if (disabled) return;

          onClick?.();

          if (stopPropagationOnClickResult) {
            e.stopPropagation();
          }
        }}
      >
        <div className="flex gap-2 items-center">
          {icon && (
            <span className="size-[18px] leading-none shrink-0">{icon}</span>
          )}
          <span className="ml-0!">{label}</span>
        </div>
        <span className="hidden md:inline ml-5 text-xs text-gray-400 leading-none">
          {shortcut}
        </span>
      </ItemTag>
    );
  } else {
    buildLabel = (
      <ItemTag
        {...(stopPropagationOnClickResult
          ? { 'data-stop-propagation': stopPropagationOnClickResult }
          : {})}
        // We need to use the xl-dropdown class here to ensure that the dropdown item is styled correctly when it is inside a submenu title
        className={classNames(
          'xl-dropdown flex items-center gap-2 group size-full',
          isCustomContent ? 'p-0' : 'py-0.5 px-3',
        )}
        data-label={label}
        data-qa={dataQa}
        disabled={disabled}
        onClick={(e) => {
          if (disabled) return;

          onClick?.();

          if (stopPropagationOnClickResult) {
            e.stopPropagation();
          }
        }}
      >
        {icon && (
          <span className="size-[18px] leading-none shrink-0">{icon}</span>
        )}
        {label}
      </ItemTag>
    );
  }

  buildLabel = tooltip ? (
    <Tooltip
      className={classNames(
        // We need to use the xl-dropdown class here to ensure that the dropdown item is styled correctly when it is inside a submenu title
        'xl-dropdown',
        disabled && 'hover:cursor-not-allowed',
      )}
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
  checked: boolean,
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
