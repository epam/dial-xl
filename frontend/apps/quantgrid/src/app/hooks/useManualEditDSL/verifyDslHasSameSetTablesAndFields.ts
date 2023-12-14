import { SheetReader } from '@frontend/parser';

export function verifyDslHasSameSetTablesAndFields(
  currentDsl: string,
  newDsl: string
) {
  const currentSheet = SheetReader.parseSheet(currentDsl);
  const newSheet = SheetReader.parseSheet(newDsl);

  if (newSheet.tables.length !== currentSheet.tables.length) {
    return true;
  }

  for (let i = 0; i < newSheet.tables.length; i++) {
    const newTable = newSheet.tables[i];
    const currentTable = currentSheet.tables[i];

    if (newTable.tableName !== currentTable.tableName) return true;
    if (newTable.fields.length !== currentTable.fields.length) return true;

    for (let j = 0; j < newTable.fields.length; j++) {
      const newField = newTable.fields[j];
      const currentField = currentTable.fields[j];

      if (newField.key.fieldName !== currentField.key.fieldName) {
        return true;
      }
    }
  }

  return false;
}
