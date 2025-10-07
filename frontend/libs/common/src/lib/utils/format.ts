import Big from 'big.js';
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

export const DigitsModeKeys = {
  DecimalDigits: 'decimalDigits',
  TotalDigits: 'totalDigits',
  CompactK: 'compactK',
  CompactM: 'compactM',
  CompactB: 'compactB',
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

const formatNumberDecimalDigits = (
  value: number,
  decimalDigits: number,
  useThousandsSeparator: boolean
) => {
  return new Intl.NumberFormat(numberLocale, {
    minimumFractionDigits: decimalDigits,
    maximumFractionDigits: decimalDigits,
    useGrouping: useThousandsSeparator,
  }).format(value);
};

const formatCompact = (
  value: number,
  compactType: string,
  useThousandsSeparator: boolean
) => {
  let divisor = 0;

  switch (compactType) {
    case 'K': {
      divisor = 1e3;
      break;
    }
    case 'M': {
      divisor = 1e6;
      break;
    }
    case 'B': {
      divisor = 1e9;
      break;
    }
    default:
      break;
  }

  if (!divisor) return value.toString();

  let mantissa = Big(value / divisor).toFixed(1);
  if (mantissa.endsWith('.0')) mantissa = mantissa.slice(0, -2);

  const result =
    Intl.NumberFormat(numberLocale, {
      useGrouping: useThousandsSeparator,
    }).format(Number(mantissa)) + compactType;

  return result;
};

const formatTotalCompact = (
  value: number,
  totalDigits: number,
  useThousandsSeparator: boolean
) => {
  const compacts = [
    { divisor: 1e3, modifier: 'K' },
    { divisor: 1e6, modifier: 'M' },
    { divisor: 1e9, modifier: 'B' },
  ];

  for (const { divisor, modifier } of compacts) {
    const resultedValue = Big(value).div(divisor);
    const integerPart = resultedValue.toString().split('.')[0];
    for (let frac = totalDigits - integerPart.length; frac >= 0; frac--) {
      const candidate = resultedValue.toFixed(frac);

      if (
        (candidate.endsWith('0') && candidate.includes('.')) ||
        candidate === '0'
      )
        continue;

      if (candidate.length - (frac > 0 ? 1 : 0) <= totalDigits) {
        return (
          Intl.NumberFormat(numberLocale, {
            useGrouping: useThousandsSeparator,
          }).format(Number(candidate)) + modifier
        );
      }
    }
  }

  return '';
};

const formatNumberTotalDigits = (
  value: number,
  totalDigits: number,
  useThousandsSeparator: boolean,
  isExpFormat?: boolean
) => {
  const normalizedTotalDigits = Math.abs(Math.min(-4, totalDigits));

  const valueString = value.toString();
  const isScientificValue =
    isExpFormat || valueString.toLowerCase().includes('e');
  const integerPartLength = valueString.split('.')[0].length;

  if (!isScientificValue && integerPartLength <= normalizedTotalDigits) {
    const candidate = new Intl.NumberFormat(numberLocale, {
      maximumFractionDigits: normalizedTotalDigits - integerPartLength,
      useGrouping: useThousandsSeparator,
    }).format(value);

    if (candidate && candidate !== '0') {
      return candidate;
    }
  }

  // compact case
  if (!isScientificValue) {
    const resultedValue = formatTotalCompact(
      value,
      normalizedTotalDigits,
      useThousandsSeparator
    );

    if (resultedValue) return resultedValue;
  }

  // scientific case
  const decimalGuess = Math.max(0, normalizedTotalDigits - 2); // 2 = integer + exponent
  for (let frac = decimalGuess; frac >= 0; frac--) {
    const exp = Big(value)
      .toExponential(frac)
      .replace('e', 'E')
      .replace('E+', 'E')
      .replace(/E(-?|\+?)0+(\d)/, 'E$1$2'); // strip leading zeros

    const integerPartLength = exp.includes('.') ? exp.split('.')[0].length : 1;
    const digit = exp.split('E')[0];
    const exponentDigits = Math.abs(Number(exp.split('E')[1])).toString()
      .length;
    if (exponentDigits > 3) continue; // |exp| must be ≤ 999

    if (
      integerPartLength + frac + exponentDigits <= normalizedTotalDigits &&
      !digit?.endsWith('0')
    )
      return exp; // first fit wins
  }

  return value.toString();
};

const formatNumberDigits = (
  value: number,
  decimalDigits: number | string,
  useThousandsSeparator: boolean,
  isExpFormat?: boolean
) => {
  const parsedDecimalDigits =
    typeof decimalDigits === 'string'
      ? parseInt(decimalDigits, 10)
      : decimalDigits;

  return parsedDecimalDigits >= 0
    ? formatNumberDecimalDigits(
        value,
        parsedDecimalDigits,
        useThousandsSeparator
      )
    : formatNumberTotalDigits(
        value,
        parsedDecimalDigits,
        useThousandsSeparator,
        isExpFormat
      );
};

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
        const argsFormat = typedArgs.format;
        const isCompactFormat =
          typeof argsFormat === 'string' &&
          ['K', 'M', 'B'].includes(argsFormat);
        const computedValue = isCompactFormat
          ? formatCompact(
              numberValue,
              argsFormat,
              typedArgs.useThousandsSeparator
            )
          : formatNumberDigits(
              numberValue,
              argsFormat,
              typedArgs.useThousandsSeparator
            );

        return computedValue;
      }
      case FormatType.FORMAT_TYPE_SCIENTIFIC: {
        const typedArgs = format.scientificArgs;

        if (!typedArgs || typeof typedArgs.format !== 'number') break;

        const numberValue = parsedValue;
        const argsFormat = typedArgs.format;
        const computedValue =
          argsFormat >= 0
            ? Big(numberValue)
                .toExponential(argsFormat)
                .replace('e', 'E')
                .replace('E+', 'E')
            : formatNumberDigits(numberValue, typedArgs.format, false, true);

        return computedValue;
      }
      case FormatType.FORMAT_TYPE_PERCENTAGE: {
        const typedArgs = format.percentageArgs;

        if (!typedArgs) break;

        const argsFormat = typedArgs.format;
        const isCompactFormat =
          typeof argsFormat === 'string' &&
          ['K', 'M', 'B'].includes(argsFormat);
        const numberValue = parsedValue;
        const computedValue =
          (isCompactFormat
            ? formatCompact(
                numberValue,
                argsFormat,
                typedArgs.useThousandsSeparator
              )
            : formatNumberDigits(
                numberValue * 100,
                argsFormat,
                typedArgs.useThousandsSeparator
              )) + '%';

        return computedValue;
      }
      case FormatType.FORMAT_TYPE_CURRENCY: {
        const typedArgs = format.currencyArgs;

        if (!typedArgs) break;

        const argsFormat = typedArgs.format;
        const isCompactFormat =
          typeof argsFormat === 'string' &&
          ['K', 'M', 'B'].includes(argsFormat);
        const numberValue = parsedValue;
        const computedValue =
          typedArgs.symbol +
          ' ' +
          (isCompactFormat
            ? formatCompact(
                numberValue,
                argsFormat,
                typedArgs.useThousandsSeparator
              )
            : formatNumberDigits(
                numberValue,
                argsFormat,
                typedArgs.useThousandsSeparator
              ));

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
