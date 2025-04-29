import { createEditableSheet, SheetReader } from '../../';
import { Sheet } from '../Sheet';

export function createEditableTestSheet(dsl: string): Sheet {
  const parsedSheet = SheetReader.parseSheet(dsl);

  return createEditableSheet('Sheet1', dsl, parsedSheet.tables);
}
