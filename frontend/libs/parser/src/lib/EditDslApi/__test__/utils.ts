import { SheetReader } from '../../SheetReader';
import { createEditableSheet } from '../EditDslApi';
import { Sheet } from '../Sheet';

export function createEditableTestSheet(dsl: string): Sheet {
  const parsedSheet = SheetReader.parseSheet(dsl);

  return createEditableSheet('Sheet1', dsl, parsedSheet.tables);
}
