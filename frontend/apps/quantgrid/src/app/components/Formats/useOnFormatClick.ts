import { useCallback } from 'react';

import { useFieldEditDsl, useGridApi } from '../../hooks';
import {
  CurrencyKeyData,
  DateTimeKeyData,
  FormatKeyData,
  NumberKeyData,
} from '../../types/format';
import { FormatKeys } from '../../utils';

export const useOnFormatClick = () => {
  const api = useGridApi();
  const { setFormat } = useFieldEditDsl();

  const onClick = useCallback(
    (action: string, data: FormatKeyData) => {
      if (!api) return;

      const selection = api.selection$.getValue();

      if (!selection) return;

      const cell = api.getCell(selection.startCol, selection.startRow);

      if (!cell?.table || !cell.field) return;

      switch (action) {
        case FormatKeys.General:
        case FormatKeys.Text:
          setFormat(cell.table.tableName, cell.field.fieldName, action, []);
          break;
        case FormatKeys.Integer: {
          const castedData = data as NumberKeyData;

          setFormat(cell.table.tableName, cell.field.fieldName, action, [
            castedData.thousandComma ?? false,
          ]);
          break;
        }
        case FormatKeys.Number: {
          const castedData = data as NumberKeyData;

          setFormat(cell.table.tableName, cell.field.fieldName, action, [
            castedData.decimalAmount ?? 1,
            castedData.thousandComma ?? false,
          ]);
          break;
        }
        case FormatKeys.Scientific: {
          const castedData = data as NumberKeyData;

          setFormat(cell.table.tableName, cell.field.fieldName, action, [
            castedData.decimalAmount ?? 1,
          ]);
          break;
        }
        case FormatKeys.Currency: {
          const castedData = data as CurrencyKeyData;

          setFormat(cell.table.tableName, cell.field.fieldName, action, [
            castedData.decimalAmount ?? 1,
            castedData.thousandComma ?? false,
            castedData.currencySymbol ?? 'EUR', // TODO: use default from library
          ]);
          break;
        }
        case FormatKeys.Date: {
          const castedData = data as DateTimeKeyData;

          setFormat(cell.table.tableName, cell.field.fieldName, action, [
            castedData.patternDate ?? 'dd-M-yyyy',
          ]);
          break;
        }
        case FormatKeys.Time: {
          const castedData = data as DateTimeKeyData;

          setFormat(cell.table.tableName, cell.field.fieldName, action, [
            castedData.patternDate ?? 'HH:mm',
          ]);
          break;
        }
        case FormatKeys.Percentage: {
          const castedData = data as NumberKeyData;

          setFormat(cell.table.tableName, cell.field.fieldName, action, [
            castedData.decimalAmount ?? 1,
          ]);
          break;
        }
        default:
          return;
      }
    },
    [api, setFormat]
  );

  return {
    onFormatClick: onClick,
  };
};
