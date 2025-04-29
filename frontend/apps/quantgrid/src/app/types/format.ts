export interface DateTimeKeyData {
  patternDate: string;
}

export interface NumberKeyData {
  thousandComma?: boolean;
  decimalAmount?: number;
}

export type CurrencyKeyData = NumberKeyData & {
  currencySymbol: string;
};

export type FormatKeyData = DateTimeKeyData | NumberKeyData | CurrencyKeyData;
