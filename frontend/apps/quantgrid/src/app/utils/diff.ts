import { DiffData } from '@frontend/common';
import { OverrideRow, OverrideRows, ParsedTable } from '@frontend/parser';

function isEqualRow(row1: OverrideRow, row2: OverrideRow): boolean {
  return Object.keys(row1).every((key) => row1[key] === row2[key]);
}

function getOverrideRowsDiff(
  oldRows: OverrideRows,
  newRows: OverrideRows
): OverrideRows {
  if (!oldRows) return newRows;
  if (!newRows) return null;

  const differences: OverrideRow[] = [];

  for (let i = 0; i < newRows.length; i++) {
    const newRow = newRows[i];
    const match = oldRows.find((oldRow) => isEqualRow(oldRow, newRow));

    if (!match) {
      const changedRow: OverrideRow = {};
      const oldMatch = oldRows.find((oldRow) =>
        Object.keys(oldRow).some((key) => newRow[key] !== undefined)
      );

      for (const key in newRow) {
        if (newRow[key] !== oldMatch?.[key]) {
          changedRow[key] = newRow[key];
        }
      }

      differences.push(changedRow);
    }
  }

  return differences.length > 0 ? differences : null;
}

export const getTableDiff = (
  table: ParsedTable,
  previousTableValue: ParsedTable | undefined
): DiffData => {
  if (!previousTableValue)
    return {
      table: true,
      fields: [],
      overrides: [],
    };

  const changedFields = table.fields.filter((field) => {
    const prevField = previousTableValue.fields.find(
      ({ key: { fieldName } }) => fieldName === field.key.fieldName
    );

    return (
      !prevField ||
      prevField.expressionMetadata?.text !== field.expressionMetadata?.text
    );
  });

  const overridesDiff = getOverrideRowsDiff(
    previousTableValue.overrides?.overrideRows ?? [],
    table.overrides?.overrideRows ?? []
  );

  return {
    table: false,
    fields: changedFields.map((field) => field.key.fieldName),
    overrides: overridesDiff,
  };
};
