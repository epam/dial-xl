import { TableHighlightDataMap } from '@frontend/common';
import { SheetReader, unescapeTableName } from '@frontend/parser';

import { sortSheetTables } from '../../services';
import { ViewGridData } from './ViewGridData';

export function parseAndSyncSheet(
  viewGridData: ViewGridData,
  content: string | undefined,
  isDSLChange: boolean,
  diffData: TableHighlightDataMap | null
) {
  try {
    const sheet = SheetReader.parseSheet(content);

    const currentTableNames: string[] = [];

    sheet.tables.forEach((table) => {
      if (table.hasDynamicFields()) {
        const cachedDynamicFields = viewGridData.getTableDynamicFields(
          table.tableName
        );

        if (cachedDynamicFields) {
          // should add cached dynamic fields to the table until new updated dynamic fields come, if we had such
          table.setDynamicFields(cachedDynamicFields);
        }
      }

      viewGridData.updateTableMeta(table, {
        highlightData: diffData
          ? diffData.data?.[unescapeTableName(table.tableName)] ?? {
              tableHighlight: diffData.defaultHighlight,
            }
          : undefined,
        isDSLChange,
      });

      currentTableNames.push(table.tableName);
    });

    viewGridData.removeRedundantTables(currentTableNames);
    viewGridData.clearCachedViewports();
    viewGridData.updateTableOrder(sortSheetTables(sheet.tables));

    return sheet;
  } catch {
    return null;
  }
}
