import { ControlData, formatValue } from '@frontend/common';

export const debounceDelay = 400;
export const controlListMaxHeight = 150;
export const controlListItemHeight = 28;

/**
 * Normalize value by removing quotes if present
 */
export function normalizeControlValue(value: string): string {
  const trimmed = value.trim();
  // Remove surrounding quotes if present
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export type AvailabilityItemBase = {
  value: string;
  displayValue: string;
  isUnavailable: boolean;
};

export function buildItems(
  controlData: ControlData | null
): AvailabilityItemBase[] {
  if (!controlData?.data || !controlData?.available) return [];
  const { data: values, format } = controlData.data;
  const flags = controlData.available.data;

  return values.map((value: string, i: number) => {
    const isUnavailable = flags[i] !== '1';
    const displayValue = format ? formatValue(value, format) : value;

    return { value, displayValue, isUnavailable };
  });
}
