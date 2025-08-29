import { useCallback } from 'react';

import { FormatKeys, resetFormatKey } from '@frontend/common';

import { useFieldEditDsl, useGridApi } from '../../hooks';
import {
  CurrencyKeyData,
  DateTimeKeyData,
  FormatKeyData,
  NumberKeyData,
} from '../../types/format';

export const useOnFormatClick = () => {
  const api = useGridApi();
  const { setFormat } = useFieldEditDsl();

  const onClick = useCallback(
    (action: string, data: FormatKeyData | undefined) => {
      if (!api) return;

      const selection = api.selection$.getValue();

      if (!selection) return;

      const cell = api.getCell(selection.startCol, selection.startRow);

      if (!cell?.table || !cell.field) return;

      switch (action) {
        case FormatKeys.General:
        case FormatKeys.Text:
        case FormatKeys.Boolean:
          setFormat(cell.table.tableName, cell.field.fieldName, action, []);
          break;
        case FormatKeys.Integer:
        case FormatKeys.Number: {
          const castedData = data as NumberKeyData | undefined;

          setFormat(cell.table.tableName, cell.field.fieldName, action, [
            castedData?.decimalAmount ?? 1,
            castedData?.thousandComma ?? false,
          ]);
          break;
        }
        case FormatKeys.Scientific: {
          const castedData = data as NumberKeyData | undefined;

          setFormat(cell.table.tableName, cell.field.fieldName, action, [
            castedData?.decimalAmount ?? 1,
          ]);
          break;
        }
        case FormatKeys.Currency: {
          const castedData = data as CurrencyKeyData | undefined;

          setFormat(cell.table.tableName, cell.field.fieldName, action, [
            castedData?.decimalAmount ?? 1,
            castedData?.thousandComma ?? false,
            castedData?.currencySymbol ?? 'EUR',
          ]);
          break;
        }
        case FormatKeys.DateTime:
        case FormatKeys.Time:
        case FormatKeys.Date: {
          const castedData = data as DateTimeKeyData | undefined;

          setFormat(cell.table.tableName, cell.field.fieldName, action, [
            castedData?.patternDate ?? 'dd-M-yyyy',
          ]);
          break;
        }
        case FormatKeys.Percentage: {
          const castedData = data as NumberKeyData | undefined;

          setFormat(cell.table.tableName, cell.field.fieldName, action, [
            castedData?.decimalAmount ?? 1,
          ]);
          break;
        }
        case resetFormatKey: {
          setFormat(cell.table.tableName, cell.field.fieldName);
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
