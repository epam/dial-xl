import { isValid as isValidDate } from 'date-fns';

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
  isResetExplicitFormat: boolean
): MenuItem[] => {
  const currencies = getGroupedCurrencies();

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
      labelDefault: '11-14-2024',
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
      labelDefault: '2024-11-14',
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
      labelDefault: '14/11/2024',
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
      labelDefault: '11/14/2024',
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
      labelDefault: '14 November 2024',
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
      labelDefault: 'November 14, 2024',
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
      labelDefault: '2024, November 14',
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
      labelDefault: '14:30',
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'hh:mm aa',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'hh:mm aa',
        },
      },
      labelDefault: '02:30 PM',
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
      labelDefault: '14:30:00',
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'hh:mm:ss aa',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'hh:mm:ss aa',
        },
      },
      labelDefault: '02:30:00 PM',
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'h:mm aa',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'h:mm aa',
        },
      },
      labelDefault: '2:30 PM',
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'hh:mm aaa',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'hh:mm aaa',
        },
      },
      labelDefault: '02:30 pm',
    },
  ];

  const dateTimeConfig = [
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'M/dd/yyyy hh:mm aa',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'M/dd/yyyy hh:mm aa',
        },
      },
      labelDefault: '11/14/2024 02:30 PM',
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
      labelDefault: '14/11/2024 14:30',
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
      labelDefault: '2024-11-14 14:30:00',
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'LLLL d, yyyy hh:mm:ss aa',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'LLLL d, yyyy hh:mm:ss aa',
        },
      },
      labelDefault: 'November 14, 2024 02:30:00 PM',
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'd LLLL yyyy h:mm aa',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'd LLLL yyyy h:mm aa',
        },
      },
      labelDefault: '14 November 2024 2:30 PM',
    },
    {
      key: FormatKeys.Date,
      keyData: {
        patternDate: 'M-dd-yyyy hh:mm aa',
      } as DateTimeKeyData,
      labelFormat: {
        type: FormatType.FORMAT_TYPE_DATE,
        dateArgs: {
          pattern: 'M-dd-yyyy hh:mm aa',
        },
      },
      labelDefault: '11-14-2024 02:30 pm',
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
      labelDefault: '2024, November 14 14:30',
    },
  ];

  return [
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.General),
      label: 'General',
    }),
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.Text),
      label: 'Text',
    }),
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.Number, {
        thousandComma: false,
        digitsAmount: 0,
      } as NumberKeyData),
      label: 'Integer',
    }),
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.Number, {
        thousandComma: false,
        digitsAmount: 1,
      } as NumberKeyData),
      label: 'Number',
    }),
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.Scientific, {
        digitsAmount: 1,
      } as NumberKeyData),
      label: 'Scientific',
    }),
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.Currency),
      children: [
        ...currencies.mainCurrencies.map((item) =>
          getDropdownItem({
            key: getDropdownMenuKey(FormatKeys.Currency, {
              digitsAmount: 1,
              currencySymbol: item.symbol,
              thousandComma: false,
              currency: item.currency,
            } as CurrencyKeyData),
            label: item.currency,
            shortcut: `${item.symbol} (${item.code})`,
          })
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
            label: item.currency,
            shortcut: `${item.symbol} (${item.code})`,
          })
        ),
      ],
      label: 'Currency',
    }),
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.Date),
      label: 'Date',
      children: dateConfig.map((item) =>
        getDropdownItem({
          key: getDropdownMenuKey(item.key, item.keyData),
          label:
            value && isValidDate(value)
              ? formatValue(value, item.labelFormat)
              : item.labelDefault,
        })
      ),
    }),
    getDropdownItem({
      key: FormatKeys.Time,
      label: 'Time',
      children: timeConfig.map((item) =>
        getDropdownItem({
          key: getDropdownMenuKey(item.key, item.keyData),
          label:
            value && isValidDate(value)
              ? formatValue(value, item.labelFormat)
              : item.labelDefault,
        })
      ),
    }),
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.DateTime),
      label: 'Date & Time',
      children: dateTimeConfig.map((item) =>
        getDropdownItem({
          key: getDropdownMenuKey(item.key, item.keyData),
          label:
            value && isValidDate(value)
              ? formatValue(value, item.labelFormat)
              : item.labelDefault,
        })
      ),
    }),
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.Percentage),
      label: 'Percentage',
    }),
    getDropdownDivider(),
    getDropdownItem({
      key: getDropdownMenuKey(resetFormatKey),
      label: 'Reset explicit format',
      disabled: !isResetExplicitFormat,
      tooltip: !isResetExplicitFormat
        ? disabledTooltips.noExplicitFormatToReset
        : undefined,
    }),
  ] as MenuItem[];
};

export const getDigitsModeItems = () => {
  return [
    getDropdownItem({
      key: getDropdownMenuKey(DigitsModeKeys.DecimalDigits),
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
