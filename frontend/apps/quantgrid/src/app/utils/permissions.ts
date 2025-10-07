import { ResourcePermission } from '@frontend/common';

export const normalizePermissionsLabels = (
  permissions: ResourcePermission[]
): ('View' | 'Edit' | 'Share')[] => {
  const isWrite = permissions.includes('WRITE');

  return (
    isWrite
      ? permissions.filter((permission) => permission !== 'READ')
      : permissions
  )
    .map((permission) =>
      permission === 'READ'
        ? 'View'
        : permission === 'WRITE'
        ? 'Edit'
        : permission === 'SHARE'
        ? 'Share'
        : undefined
    )
    .sort((a, b) => {
      if (a === 'View' && b === 'View') return 0;
      if (a === 'View' && b !== 'View') return -1;
      if (a !== 'View' && b === 'View') return 1;

      if (a === 'Edit' && b === 'Edit') return 0;
      if (a === 'Edit' && b === 'Share') return -1;

      return 0;
    })
    .filter((permission) => !!permission);
};
