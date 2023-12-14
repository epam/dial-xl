import { MenuItem, MenuItemProps } from '@frontend/common';

export function getDropdownItem(props: MenuItemProps): MenuItem {
  const { label, key, disabled, shortcut } = props;

  const buildLabel = shortcut ? (
    <div className="flex justify-between items-center">
      <span>{label}</span>
      <span className="ml-5 text-xs text-gray-400">{shortcut}</span>
    </div>
  ) : (
    label
  );

  return { key, label: buildLabel, disabled } as MenuItem;
}

export function getDropdownDivider(): MenuItem {
  return { type: 'divider' };
}
