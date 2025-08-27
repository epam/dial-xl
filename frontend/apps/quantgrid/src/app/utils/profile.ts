import { ExecutionType, Profile } from '@frontend/common';

/**
 * Generates a unique key for a profile entity to use in tracking
 * Includes the profile type to track compute and index operations separately
 * @param p The profile to generate a key for
 * @returns A unique string key representing the entity and its type
 */
export function generateProfileEntityKey(
  requestId: string,
  p: Profile
): string | undefined {
  const typePrefix = p.type ? `${p.type}:` : '';

  if (p.tableKey) {
    return `req:${requestId};${typePrefix}table:${p.tableKey.table}`;
  }

  if (p.fieldKey) {
    return `req:${requestId};${typePrefix}field:${p.fieldKey.table}:${p.fieldKey.field}`;
  }

  if (p.totalKey) {
    return `req:${requestId};${typePrefix}total:${p.totalKey.table}:${p.totalKey.field}:${p.totalKey.number}`;
  }

  if (p.overrideKey) {
    return `req:${requestId};${typePrefix}override:${p.overrideKey.table}:${p.overrideKey.field}:${p.overrideKey.row}`;
  }

  return;
}

/**
 * Sorts profiles by type and start time:
 * - INDEX types come first
 * - Then sort by start time (if available)
 * @param profiles Profiles to sort
 * @returns Sorted array of profiles
 */
export function sortProfiles(profiles: Profile[]): Profile[] {
  return [...profiles].sort((a, b): number => {
    // Prioritize INDEX types
    if (a.type === ExecutionType.INDEX && b.type !== ExecutionType.INDEX)
      return -1;
    if (a.type !== ExecutionType.INDEX && b.type === ExecutionType.INDEX)
      return 1;

    // Then sort by start time if available
    if (a.startedAt !== undefined && b.startedAt !== undefined) {
      return a.startedAt - b.startedAt;
    }

    return 0;
  });
}
