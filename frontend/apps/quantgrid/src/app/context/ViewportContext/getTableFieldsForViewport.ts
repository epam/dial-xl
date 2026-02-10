import { GridViewport } from '@frontend/common';
import {
  dynamicFieldName,
  ParsedTable,
  unescapeFieldName,
} from '@frontend/parser';

import {
  DynamicColumnRange,
  extraDirectionOffset,
  TableFieldsForViewportResult,
} from './types';

/**
 * Selects which table fields should be requested for the current viewport.
 */
export function getTableFieldsForViewport(
  viewport: GridViewport,
  table: ParsedTable,
  dynamicFields?: (string | undefined)[],
  isDynamicFieldsRequested = false,
): TableFieldsForViewportResult {
  const [tableStartRow, tableStartCol] = table.getPlacement();
  const isTableHorizontal = table.getIsTableDirectionHorizontal();

  // Fields are placed along one axis depending on table orientation.
  const directionStart = isTableHorizontal ? tableStartRow : tableStartCol;
  const viewportDirectionStart = isTableHorizontal
    ? viewport.startRow
    : viewport.startCol;
  const viewportDirectionEnd = isTableHorizontal
    ? viewport.endRow
    : viewport.endCol;

  const visibleStart = Math.max(
    0,
    viewportDirectionStart - extraDirectionOffset,
  );
  const visibleEnd = viewportDirectionEnd + extraDirectionOffset;

  const tableFields = table.fields;
  const dynamicBlockStartIndex = table.getDynamicBlockStartIndex();
  const hasDynamic = table.hasDynamicFields() && dynamicBlockStartIndex !== -1;
  const dynamicCount = dynamicFields?.length ?? 0;

  // Precompute mapping to avoid repeated lookups.
  const realIndexByField = new Map<string, number>();
  tableFields.forEach(({ key }, i) => realIndexByField.set(key.fieldName, i));

  // Static fields (everything except '*') with their absolute coordinate.
  const staticFieldsWithCoord = table
    .getFieldsWithoutDynamic()
    .map(({ key }, index) => {
      const realIndex = realIndexByField.get(key.fieldName) ?? -1;

      // Base coordinate if there were no dynamic columns.
      let directionValue = index + directionStart;

      // If the field is positioned after '*', shift it by the dynamic column count.
      if (hasDynamic && realIndex > dynamicBlockStartIndex) {
        directionValue += dynamicCount;
      }

      return {
        fieldName: unescapeFieldName(key.fieldName),
        directionValue,
      };
    });

  const fieldsToRequest: string[] = staticFieldsWithCoord
    .filter(
      ({ directionValue }) =>
        directionValue >= visibleStart && directionValue <= visibleEnd,
    )
    .map(({ fieldName }) => fieldName);

  // Dynamic placeholder range.
  let dynamicRange: DynamicColumnRange | undefined;

  if (hasDynamic && dynamicBlockStartIndex !== -1) {
    const dynamicStartCoord = directionStart + dynamicBlockStartIndex;

    const dynamicEndCoord =
      dynamicCount > 0
        ? dynamicStartCoord + dynamicCount - 1
        : isDynamicFieldsRequested
          ? dynamicStartCoord - 1
          : Number.POSITIVE_INFINITY;

    const overlapStartCoord = Math.max(visibleStart, dynamicStartCoord);
    const overlapEndCoord = Math.min(visibleEnd, dynamicEndCoord);

    if (overlapEndCoord >= overlapStartCoord) {
      const start = Math.max(0, overlapStartCoord - dynamicStartCoord);
      const end = Math.max(start + 1, overlapEndCoord - dynamicStartCoord + 1);
      dynamicRange = { start, end };

      fieldsToRequest.push(dynamicFieldName);
    }
  }

  // Ensure all key fields are requested.
  // Reason: key values are used in formulas, e.g., for expanding tables.
  for (const field of tableFields) {
    if (!field.isKey) continue;
    const keyFieldName = unescapeFieldName(field.key.fieldName);
    if (!fieldsToRequest.includes(keyFieldName)) {
      fieldsToRequest.push(keyFieldName);
    }
  }

  return {
    fields: Array.from(new Set(fieldsToRequest)),
    dynamicRange,
  };
}
