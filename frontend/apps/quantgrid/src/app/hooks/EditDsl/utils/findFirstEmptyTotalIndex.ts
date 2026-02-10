import { ParsedTotal } from '@frontend/parser';

export function findFirstEmptyTotalIndex(
  parsedTotal: ParsedTotal,
  fieldName: string
): number | null {
  const totalSize = parsedTotal.size;
  const fieldTotals = parsedTotal.getFieldTotal(fieldName);

  // No totals for source field yet => get existing first total row
  if (!fieldTotals) {
    const firstTotalRow = parsedTotal.getTotalByIndex(1);

    if (firstTotalRow.length === 0) return null;

    return 1;
  }

  const fieldTotalKeys = Object.keys(fieldTotals);
  const existingIndexes = fieldTotalKeys.sort(
    (a, b) => parseInt(a) - parseInt(b)
  );

  // Search for empty placement in the existing rows
  for (let i = 1; i <= totalSize; i++) {
    if (!existingIndexes.includes(i.toString())) {
      const targetTotalRow = parsedTotal.getTotalByIndex(i);

      if (targetTotalRow.length === 0) return null;

      return i;
    }
  }

  // No placement found => create new total row
  return parsedTotal.size + 1;
}
