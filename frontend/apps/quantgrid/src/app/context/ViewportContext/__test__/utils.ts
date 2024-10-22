import { ColumnData, ColumnDataType } from '@frontend/common';
import { SheetReader } from '@frontend/parser';

import { chunkSize } from '../ViewGridData';

type GenerateTableDataParams = {
  hasErrors?: boolean;
  hasDifferentTypes?: boolean;
  rowCount?: number;
};

const defaultRowCount = 1000;

export const getFirstTableFromDSL = (dsl: string) => {
  return getTablesFromDSL(dsl)[0];
};

export const getTablesFromDSL = (dsl: string) => {
  const parsedSheet = SheetReader.parseSheet(dsl);

  return parsedSheet.tables;
};

export const generateTablesWithData = (
  sheetDSL: string,
  tableParams: GenerateTableDataParams
) => {
  const sheet = SheetReader.parseSheet(sheetDSL);

  const columnUpdates = [];

  const tablesWithData = [];

  for (const table of sheet.tables) {
    const { tableName, fields } = table;
    const errorsMessages: Record<string, string> = {};

    if (tableParams.hasErrors) {
      errorsMessages[fields[0].key.fieldName] =
        'Some error in field ' + fields[0].key.fieldName;
    }

    const rowCount = tableParams.rowCount || defaultRowCount;

    const data: Record<string, string[]> = {};

    for (const {
      key: { fieldName },
    } of fields) {
      const fieldData = new Array(rowCount);

      for (let i = 0; i < fieldData.length; ++i) {
        fieldData[i] = `cell,row=${i},field=${fieldName}`;
      }

      data[fieldName] = fieldData;
    }

    for (const {
      key: { fieldName },
    } of fields) {
      const fieldUpdatesCount = Math.ceil(rowCount / chunkSize);

      let currentIndex = 0;

      const fieldData = data[fieldName];

      const fieldUpdates: ColumnData[] = [];

      for (let i = 0; i < fieldUpdatesCount; ++i) {
        const sendData = [];

        const startRow = currentIndex;
        const endRow = currentIndex + chunkSize - 1;

        for (let j = startRow; j <= endRow; ++j) {
          if (!(j in fieldData)) {
            break;
          }

          sendData.push(fieldData[j]);
        }

        currentIndex += chunkSize;

        fieldUpdates.push({
          fieldKey: {
            field: fieldName,
            table: tableName,
          },
          data: sendData,
          endRow: endRow.toString(),
          startRow: startRow.toString(),
          isNested: false,
          errorMessage: errorsMessages[fieldName],
          type: ColumnDataType.STRING,
          referenceTableName: '',
          periodSeries: [],
          isPending: false,
          version: 0,
        });
      }

      columnUpdates.push(...fieldUpdates);
    }

    tablesWithData.push({ table, data });
  }

  return {
    columnUpdates,
    tablesWithData,
  };
};
