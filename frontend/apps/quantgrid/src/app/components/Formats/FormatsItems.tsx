import { format, isValid as isValidDate } from 'date-fns';

import Icon from '@ant-design/icons';
import {
  BIcon,
  DecimalDigitsIcon,
  DigitsIcon,
  DigitsModeKeys,
  disabledTooltips,
  FormatKeys,
  FormatType,
  formatValue,
  getDropdownDivider,
  getDropdownItem,
  getDropdownMenuKey,
  getGroupedCurrencies,
  KIcon,
  KMBIcon,
  MenuItem,
  MIcon,
  resetFormatKey,
} from '@frontend/common';

import {
  CurrencyKeyData,
  DateTimeKeyData,
  NumberKeyData,
} from '../../types/format';

export const getFormatsItems = (
  value: string | undefined,
  isResetExplicitFormat: boolean,
): MenuItem[] => {
  const parsedValue = value ? parseInt(value) : undefined;
  const currencies = getGroupedCurrencies();
  const dateNow = Date.now();

  const dateConfig = [
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'M-dd-yyyy',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'M-dd-yyyy',
        },
      },
      labelDefault: format(dateNow, 'M-dd-yyyy'),
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'yyyy-M-dd',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'yyyy-M-dd',
        },
      },
      labelDefault: format(dateNow, 'yyyy-M-dd'),
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'dd/M/yyyy',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'dd/M/yyyy',
        },
      },
      labelDefault: format(dateNow, 'dd/M/yyyy'),
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'M/dd/yyyy',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'M/dd/yyyy',
        },
      },
      labelDefault: format(dateNow, 'M/dd/yyyy'),
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'd LLLL yyyy',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'd LLLL yyyy',
        },
      },
      labelDefault: format(dateNow, 'd LLLL yyyy'),
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'LLLL d, yyyy',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'LLLL d, yyyy',
        },
      },
      labelDefault: format(dateNow, 'LLLL d, yyyy'),
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'yyyy, LLLL d',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'yyyy, LLLL d',
        },
      },
      labelDefault: format(dateNow, 'yyyy, LLLL d'),
    },
  ];

  const timeConfig = [
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'HH:mm',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'HH:mm',
        },
      },
      labelDefault: format(dateNow, 'HH:mm'),
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'hh:mm a',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'hh:mm a',
        },
      },
      labelDefault: format(dateNow, 'hh:mm a'),
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'HH:mm:ss',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'HH:mm:ss',
        },
      },
      labelDefault: format(dateNow, 'HH:mm:ss'),
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'hh:mm:ss a',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'hh:mm:ss a',
        },
      },
      labelDefault: format(dateNow, 'hh:mm:ss a'),
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'h:mm a',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'h:mm a',
        },
      },
      labelDefault: format(dateNow, 'h:mm a'),
    },
  ];

  const dateTimeConfig = [
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'M/dd/yyyy hh:mm a',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'M/dd/yyyy hh:mm a',
        },
      },
      labelDefault: format(dateNow, 'M/dd/yyyy hh:mm a'),
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'dd/M/yyyy HH:mm',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'dd/M/yyyy HH:mm',
        },
      },
      labelDefault: format(dateNow, 'dd/M/yyyy HH:mm'),
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'yyyy-M-dd HH:mm:ss',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'yyyy-M-dd HH:mm:ss',
        },
      },
      labelDefault: format(dateNow, 'yyyy-M-dd HH:mm:ss'),
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'LLLL d, yyyy hh:mm:ss a',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'LLLL d, yyyy hh:mm:ss a',
        },
      },
      labelDefault: format(dateNow, 'LLLL d, yyyy hh:mm:ss a'),
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'd LLLL yyyy h:mm a',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'd LLLL yyyy h:mm a',
        },
      },
      labelDefault: format(dateNow, 'd LLLL yyyy h:mm a'),
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'M-dd-yyyy hh:mm a',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'M-dd-yyyy hh:mm a',
        },
      },
      labelDefault: format(dateNow, 'M-dd-yyyy hh:mm a'),
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'yyyy, LLLL d HH:mm',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'yyyy, LLLL d HH:mm',
        },
      },
      labelDefault: format(dateNow, 'yyyy, LLLL d HH:mm'),
    },
  ];

  const formatsPath = ['FormatsMenu'];
  const currencyPath = [...formatsPath, 'Currency'];

  return [
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.General),
      fullPath: [...formatsPath, 'General'],
      label: 'General',
    }),
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.Text),
      fullPath: [...formatsPath, 'Text'],
      label: 'Text',
    }),
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.Number, {
        thousandComma: false,
        digitsAmount: 0,
      } as NumberKeyData),
      fullPath: [...formatsPath, 'Integer'],
      label: 'Integer',
    }),
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.Number, {
        thousandComma: false,
        digitsAmount: 1,
      } as NumberKeyData),
      fullPath: [...formatsPath, 'Number'],
      label: 'Number',
    }),
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.Scientific, {
        digitsAmount: 1,
      } as NumberKeyData),
      fullPath: [...formatsPath, 'Scientific'],
      label: 'Scientific',
    }),
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.Currency),
      fullPath: currencyPath,
      children: [
        ...currencies.mainCurrencies.map((item) =>
          getDropdownItem({
            key: getDropdownMenuKey(FormatKeys.Currency, {
              digitsAmount: 1,
              currencySymbol: item.symbol,
              thousandComma: false,
              currency: item.currency,
            } as CurrencyKeyData),
            fullPath: [...currencyPath, item.code],
            label: item.currency,
            shortcut: `${item.symbol} (${item.code})`,
          }),
        ),
        getDropdownDivider(),
        ...currencies.otherCurrencies.map((item) =>
          getDropdownItem({
            key: getDropdownMenuKey(FormatKeys.Currency, {
              digitsAmount: 1,
              currencySymbol: item.symbol,
              thousandComma: false,
              currency: item.currency,
            } as CurrencyKeyData),
            fullPath: [...currencyPath, item.code],
            label: item.currency,
            shortcut: `${item.symbol} (${item.code})`,
          }),
        ),
      ],
      label: 'Currency',
    }),
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.Date),
      fullPath: [...formatsPath, 'Date'],
      label: 'Date',
      children: dateConfig.map((item, idx) =>
        getDropdownItem({
          key: getDropdownMenuKey(item.key, item.keyData),
          fullPath: [...formatsPath, 'Date', String(idx)],
          label:
            value && parsedValue && isValidDate(parsedValue)
              ? formatValue(value, item.labelFormat)
              : item.labelDefault,
        }),
      ),
    }),
    getDropdownItem({
      key: FormatKeys.Time,
      fullPath: [...formatsPath, 'Time'],
      label: 'Time',
      children: timeConfig.map((item, idx) =>
        getDropdownItem({
          key: getDropdownMenuKey(item.key, item.keyData),
          fullPath: [...formatsPath, 'Time', String(idx)],
          label:
            value && parsedValue && isValidDate(parsedValue)
              ? formatValue(value, item.labelFormat)
              : item.labelDefault,
        }),
      ),
    }),
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.DateTime),
      fullPath: [...formatsPath, 'DateTime'],
      label: 'Date & Time',
      children: dateTimeConfig.map((item, idx) =>
        getDropdownItem({
          key: getDropdownMenuKey(item.key, item.keyData),
          fullPath: [...formatsPath, 'DateTime', String(idx)],
          label:
            value && parsedValue && isValidDate(parsedValue)
              ? formatValue(value, item.labelFormat)
              : item.labelDefault,
        }),
      ),
    }),
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.Percentage),
      fullPath: [...formatsPath, 'Percentage'],
      label: 'Percentage',
    }),
    getDropdownDivider(),
    getDropdownItem({
      key: getDropdownMenuKey(resetFormatKey),
      fullPath: [...formatsPath, 'ResetExplicitFormat'],
      label: 'Reset explicit format',
      disabled: !isResetExplicitFormat,
      tooltip: !isResetExplicitFormat
        ? disabledTooltips.noExplicitFormatToReset
        : undefined,
    }),
  ] as MenuItem[];
};

export const getDigitsModeItems = () => {
  const digitsPath = ['FormatsMenu', 'DigitsMode'];
  const compactPath = [...digitsPath, 'Compact'];

  return [
    getDropdownItem({
      key: getDropdownMenuKey(DigitsModeKeys.DecimalDigits),
      fullPath: [...digitsPath, 'DecimalDigits'],
      icon: (
        <Icon
          className="h-[18px] w-[18px] shrink-0"
          component={() => <DecimalDigitsIcon />}
        ></Icon>
      ),
      label: 'Number of decimal places',
    }),
    getDropdownItem({
      key: getDropdownMenuKey(DigitsModeKeys.TotalDigits),
      fullPath: [...digitsPath, 'TotalDigits'],
      icon: (
        <Icon
          className="h-[18px] w-[18px] shrink-0"
          component={() => <DigitsIcon />}
        ></Icon>
      ),
      label: 'Number of total digits',
    }),
    getDropdownItem({
      key: getDropdownMenuKey('Compact'),
      fullPath: compactPath,
      icon: (
        <Icon
          className="h-[18px] w-[18px] shrink-0"
          component={() => <KMBIcon />}
        ></Icon>
      ),
      label: 'Compact mode',
      children: [
        getDropdownItem({
          key: getDropdownMenuKey(DigitsModeKeys.CompactK),
          fullPath: [...compactPath, 'Thousands'],
          icon: (
            <Icon
              className="h-[18px] w-[18px] shrink-0"
              component={() => <KIcon />}
            ></Icon>
          ),
          label: 'Thousands',
          shortcut: '150K',
        }),
        getDropdownItem({
          key: getDropdownMenuKey(DigitsModeKeys.CompactM),
          fullPath: [...compactPath, 'Millions'],
          icon: (
            <Icon
              className="h-[18px] w-[18px] shrink-0"
              component={() => <MIcon />}
            ></Icon>
          ),
          label: 'Millions',
          shortcut: '150M',
        }),
        getDropdownItem({
          key: getDropdownMenuKey(DigitsModeKeys.CompactB),
          fullPath: [...compactPath, 'Billions'],
          icon: (
            <Icon
              className="h-[18px] w-[18px] shrink-0"
              component={() => <BIcon />}
            ></Icon>
          ),
          label: 'Billions',
          shortcut: '150B',
        }),
      ],
    }),
  ];
};
