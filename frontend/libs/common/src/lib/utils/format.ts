import { format as formatDate } from 'date-fns';

import { UTCDateMini } from '@date-fns/utc';

import { ColumnDataType, ColumnFormat, FormatType } from '../services';

export const FormatKeys = {
  General: 'general',
  Text: 'text',
  Number: 'number',
  Boolean: 'boolean',
  Scientific: 'scientific',
  Currency: 'currency',
  Date: 'date',
  Percentage: 'percentage',

  // Keys which just aliases for another formats
  Integer: 'integer',
  Time: 'time',
  DateTime: 'dateTime',
};

export const resetFormatKey = 'resetFormatKey';

export const FormatLabel = {
  [FormatKeys.General]: 'General',
  [FormatKeys.Text]: 'Text',
  [FormatKeys.Number]: 'Number',
  [FormatKeys.Boolean]: 'Boolean',
  [FormatKeys.Scientific]: 'Scientific',
  [FormatKeys.Currency]: 'Currency',
  [FormatKeys.Date]: 'Date',
  [FormatKeys.Percentage]: 'Percentage',
};

export const FormatKeysMap = {
  FORMAT_TYPE_GENERAL: FormatKeys.General,
  FORMAT_TYPE_BOOLEAN: FormatKeys.Boolean,
  FORMAT_TYPE_CURRENCY: FormatKeys.Currency,
  FORMAT_TYPE_DATE: FormatKeys.Date,
  FORMAT_TYPE_TEXT: FormatKeys.Text,
  FORMAT_TYPE_NUMBER: FormatKeys.Number,
  FORMAT_TYPE_PERCENTAGE: FormatKeys.Percentage,
  FORMAT_TYPE_SCIENTIFIC: FormatKeys.Scientific,
};

const numberLocale = 'en-US';

// We are using start date 30 december 1899 as zero
function excelDateToJsMilliseconds(sheetDateNumber: number) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const excelEpochDifferenceInDays = 25569;

  return (sheetDateNumber - excelEpochDifferenceInDays) * millisecondsPerDay;
}

export const formatValue = (value: string, format: ColumnFormat): string => {
  try {
    const parsedValue = parseFloat(value);

    if (isNaN(parsedValue)) return value;

    switch (format.type) {
      case FormatType.FORMAT_TYPE_BOOLEAN: {
        return parsedValue ? 'TRUE' : 'FALSE';
      }
      case FormatType.FORMAT_TYPE_NUMBER: {
        const typedArgs = format.numberArgs;

        if (!typedArgs) break;

        const numberValue = parsedValue;
        const computedValue = typedArgs.useThousandsSeparator
          ? new Intl.NumberFormat(numberLocale, {
              minimumFractionDigits: typedArgs.format,
              maximumFractionDigits: typedArgs.format,
            }).format(numberValue)
          : numberValue.toFixed(typedArgs.format);

        return computedValue;
      }
      case FormatType.FORMAT_TYPE_SCIENTIFIC: {
        const typedArgs = format.scientificArgs;

        if (!typedArgs) break;

        const numberValue = parsedValue;
        const computedValue = numberValue
          .toExponential(typedArgs.format)
          .toUpperCase();

        return computedValue;
      }
      case FormatType.FORMAT_TYPE_PERCENTAGE: {
        const typedArgs = format.percentageArgs;

        if (!typedArgs) break;

        const numberValue = parsedValue;
        const computedValue =
          (numberValue * 100).toFixed(typedArgs.format) + '%';

        return computedValue;
      }
      case FormatType.FORMAT_TYPE_CURRENCY: {
        const typedArgs = format.currencyArgs;

        if (!typedArgs) break;

        const numberValue = parsedValue;
        const computedValue =
          typedArgs.symbol +
          ' ' +
          (typedArgs.useThousandsSeparator
            ? new Intl.NumberFormat(numberLocale, {
                minimumFractionDigits: typedArgs.format,
                maximumFractionDigits: typedArgs.format,
              }).format(numberValue)
            : numberValue.toFixed(typedArgs.format));

        return computedValue;
      }
      case FormatType.FORMAT_TYPE_DATE: {
        const typedArgs = format.dateArgs;

        if (!typedArgs) break;

        const numberValue = parsedValue;
        const ms = excelDateToJsMilliseconds(numberValue);
        const utcDate = new UTCDateMini(ms);
        const computedValue = formatDate(utcDate, typedArgs.pattern, {
          useAdditionalDayOfYearTokens: true,
          useAdditionalWeekYearTokens: true,
        });

        return computedValue;
      }
      default:
        break;
    }

    return value;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(e);

    return value;
  }
};

export function isGeneralFormatting(
  type: ColumnDataType,
  format?: ColumnFormat
) {
  return (
    type === ColumnDataType.DOUBLE &&
    (!format || format.type === FormatType.FORMAT_TYPE_GENERAL)
  );
}
