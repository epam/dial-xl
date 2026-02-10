import { SheetReader } from '@frontend/parser';

import { createUniqueName } from './createUniqueName';

/**
 * Automatically renames fields in a DSL to ensure unique field names across the table.
 *
 * @param {string} dsl - The DSL string representing the structure of a sheet to be processed.
 * @returns {string} - The updated DSL with renamed fields, or the original DSL if no changes were made.
 */
export const autoRenameFields = (dsl: string): string => {
  try {
    const parsedSheet = SheetReader.parseSheet(dsl);
    const editableSheet = parsedSheet.editableSheet;

    if (!editableSheet) return dsl;

    let hasFieldNameChanges = false;

    editableSheet.tables.forEach((table) => {
      const allFieldNamesSet: Set<string> = new Set();
      const existingNames: Set<string> = new Set();

      for (const fieldGroup of table.fieldGroups) {
        for (const field of fieldGroup.fields) {
          allFieldNamesSet.add(field.name);
        }
      }

      for (const fieldGroup of table.fieldGroups) {
        for (const field of fieldGroup.fields) {
          const currentFieldName = field.name;
          if (existingNames.has(currentFieldName)) {
            const newFieldName = createUniqueName(
              currentFieldName,
              Array.from(allFieldNamesSet)
            );
            allFieldNamesSet.add(newFieldName);

            field.name = newFieldName;
            hasFieldNameChanges = true;
          } else {
            existingNames.add(currentFieldName);
          }
        }
      }
    });

    return hasFieldNameChanges ? editableSheet.toDSL() : dsl;
  } catch (error) {
    return dsl;
  }
};
