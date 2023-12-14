import { SheetReader } from '@frontend/parser';

import { createUniqueName } from './createUniqueName';

type DuplicateField = {
  tableName: string;
  fieldName: string;
  newFieldName: string;
  start: number;
  end: number;
};

export const autoRenameFields = (dsl: string) => {
  try {
    const parsedSheet = SheetReader.parseSheet(dsl);
    const { tables } = parsedSheet;
    const duplicateFields: DuplicateField[] = [];

    tables.forEach((table) => {
      const { tableName } = table;
      const fieldNames = table.fields.map((f) => f.key.fieldName);
      const fieldNameSet = new Set();

      table.fields.forEach((f) => {
        const { dslFieldNamePlacement, key } = f;
        const { fieldName } = key;

        if (fieldNameSet.has(fieldName) && dslFieldNamePlacement) {
          const newFieldName = createUniqueName(fieldName, fieldNames);
          fieldNames.push(newFieldName);

          duplicateFields.push({
            tableName,
            fieldName,
            newFieldName,
            start: dslFieldNamePlacement?.start || 0,
            end: dslFieldNamePlacement?.end || 0,
          });
        } else {
          fieldNameSet.add(fieldName);
        }
      });
    });

    if (duplicateFields.length === 0) return dsl;

    const reversedFieldsByPlacement = duplicateFields.sort((a, b) => {
      return b.start - a.start;
    });

    let updatedDsl = dsl;

    reversedFieldsByPlacement.forEach((f) => {
      updatedDsl =
        updatedDsl.substring(0, f.start) +
        `[${f.newFieldName}]` +
        updatedDsl.substring(f.end);
    });

    return updatedDsl;
  } catch (error) {
    return dsl;
  }
};
