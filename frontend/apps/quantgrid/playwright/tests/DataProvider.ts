import { SpreadSheet } from '../logic-entities/SpreadSheet';
import { Table } from '../logic-entities/Table';

export function getProjectSpreadSheeet(type: string, spreadsheet: SpreadSheet) {
  switch (type) {
    case 'hiddenAll':
      for (const table of spreadsheet.getTables()) {
        table.hideFieldHeader();
        table.hideHeader();
      }
      break;
    case 'hiddenTable':
      for (const table of spreadsheet.getTables()) {
        table.hideHeader();
      }
      break;
  }

  return spreadsheet;
}
