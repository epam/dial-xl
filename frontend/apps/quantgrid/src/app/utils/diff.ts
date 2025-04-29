import { DiffData } from '@frontend/common';
import {
  defaultRowKey,
  OverrideRow,
  OverrideRows,
  ParsedTable,
} from '@frontend/parser';

function isEqualRow(row1: OverrideRow, row2: OverrideRow): boolean {
  return Object.keys(row1).every((key) => row1[key] === row2[key]);
}

function getOverrideRowsDiff(
  oldRows: OverrideRows,
  newRows: OverrideRows,
  keys?: string[]
): OverrideRows {
  if (!oldRows) return newRows;
  if (!newRows) return null;

  const differences: OverrideRow[] = [];

  for (let i = 0; i < newRows.length; i++) {
    const newRow = newRows[i];
    const match = oldRows.find((oldRow) => isEqualRow(oldRow, newRow));

    const changedRow: OverrideRow = {};
    if (match) {
      differences.push(changedRow);

      continue;
    }

    const oldMatch = keys?.length
      ? oldRows.find((oldRow) =>
          keys.every((key) => oldRow[key] === newRow[key])
        )
      : oldRows[i];

    let isAddKeys = false;
    for (const overrideKey in newRow) {
      if (newRow[overrideKey] !== oldMatch?.[overrideKey]) {
        isAddKeys = true;
        changedRow[overrideKey] = newRow[overrideKey];
      }
    }

    if (isAddKeys) {
      for (const key in keys) {
        changedRow[key] = newRow[key];
      }
    }
    differences.push(changedRow);
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
      changedFields: [],
      deletedFields: [],
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

  const deletedFields = previousTableValue.fields
    .filter(
      (field) =>
        !table.fields.find(
          (newField) => newField.key.fieldName === field.key.fieldName
        )
    )
    .map((field) => field.key.fieldName);

  const fieldKeys = table.getKeys().map((field) => field.key.fieldName);
  const keys = fieldKeys.length
    ? fieldKeys
    : !table.isManual()
    ? [defaultRowKey]
    : [];

  const overridesDiff = getOverrideRowsDiff(
    previousTableValue.overrides?.overrideRows ?? [],
    table.overrides?.overrideRows ?? [],
    keys
  );

  return {
    table: false,
    changedFields: changedFields.map((field) => field.key.fieldName),
    deletedFields,
    overrides: overridesDiff,
  };
};
