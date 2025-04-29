import {
  getCurrencies,
  getDropdownItem,
  getDropdownMenuKey,
  MenuItem,
} from '@frontend/common';

import {
  CurrencyKeyData,
  DateTimeKeyData,
  NumberKeyData,
} from '../../types/format';
import { FormatKeys } from '../../utils';

export const getFormatsItems = (): MenuItem[] => {
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
      key: getDropdownMenuKey(FormatKeys.Integer, {
        thousandComma: false,
      } as NumberKeyData),
      label: 'Integer',
    }),
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.Number, {
        thousandComma: false,
        decimalAmount: 1,
      } as NumberKeyData),
      label: 'Number',
    }),
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.Scientific, {
        decimalAmount: 1,
      } as NumberKeyData),
      label: 'Scientific',
    }),
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.Currency),
      children: [
        ...getCurrencies().map((item) =>
          getDropdownItem({
            key: getDropdownMenuKey(FormatKeys.Currency, {
              decimalAmount: 1,
              currencySymbol: item.symbol,
              thousandComma: false,
              currency: item.currency,
            } as CurrencyKeyData),
            label: item.currency,
            shortcut: item.symbol,
          })
        ),
      ],
      label: 'Currency',
    }),
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.Date),
      label: 'Date',
      children: [
        getDropdownItem({
          key: getDropdownMenuKey(FormatKeys.Date, {
            patternDate: 'M-dd-yyyy',
          } as DateTimeKeyData),
          label: '11-24-2024',
        }),
        getDropdownItem({
          key: getDropdownMenuKey(FormatKeys.Date, {
            patternDate: 'yyyy-M-dd',
          } as DateTimeKeyData),
          label: '2024-11-24',
        }),
        getDropdownItem({
          key: getDropdownMenuKey(FormatKeys.Date, {
            patternDate: 'dd/M/yyyy',
          } as DateTimeKeyData),
          label: '24/11/2024',
        }),
        getDropdownItem({
          key: getDropdownMenuKey(FormatKeys.Date, {
            patternDate: 'M/dd/yyyy',
          } as DateTimeKeyData),
          label: '11/24/2024',
        }),
        getDropdownItem({
          key: getDropdownMenuKey(FormatKeys.Date, {
            patternDate: 'd LL yyyy',
          } as DateTimeKeyData),
          label: '24 November 2024',
        }),
        getDropdownItem({
          key: getDropdownMenuKey(FormatKeys.Date, {
            patternDate: 'LL d, yyyy',
          } as DateTimeKeyData),
          label: 'November 24, 2024',
        }),
        getDropdownItem({
          key: getDropdownMenuKey(FormatKeys.Date, {
            patternDate: 'yyyy, LL d',
          } as DateTimeKeyData),
          label: '2024, November 24',
        }),
      ],
    }),
    getDropdownItem({
      key: FormatKeys.Time,
      label: 'Time',
      children: [
        getDropdownItem({
          key: getDropdownMenuKey(FormatKeys.Time, {
            patternDate: 'HH:mm',
          } as DateTimeKeyData),
          label: '14:30',
        }),
        getDropdownItem({
          key: getDropdownMenuKey(FormatKeys.Time, {
            patternDate: 'hh:mm A',
          } as DateTimeKeyData),
          label: '02:30 PM',
        }),
        getDropdownItem({
          key: getDropdownMenuKey(FormatKeys.Time, {
            patternDate: 'HH:mm:ss',
          } as DateTimeKeyData),
          label: '14:30:00',
        }),
        getDropdownItem({
          key: getDropdownMenuKey(FormatKeys.Time, {
            patternDate: 'hh:mm:ss A',
          } as DateTimeKeyData),
          label: '02:30:00 PM',
        }),
        getDropdownItem({
          key: getDropdownMenuKey(FormatKeys.Time, {
            patternDate: 'h:mm A',
          } as DateTimeKeyData),
          label: '2:30 PM',
        }),
        getDropdownItem({
          key: getDropdownMenuKey(FormatKeys.Time, {
            patternDate: 'H:mm',
          } as DateTimeKeyData),
          label: '14:30',
        }),
        getDropdownItem({
          key: getDropdownMenuKey(FormatKeys.Time, {
            patternDate: 'hh:mm a',
          } as DateTimeKeyData),
          label: '02:30 pm',
        }),
      ],
    }),
    getDropdownItem({
      key: getDropdownMenuKey(FormatKeys.Percentage),
      label: 'Percentage',
    }),
  ] as MenuItem[];
};
