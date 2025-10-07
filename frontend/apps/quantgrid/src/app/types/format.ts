export interface DateTimeKeyData {
  patternDate: string;
}

export interface NumberKeyData {
  thousandComma?: boolean;
  digitsAmount?: number; // If positive or zero - decimal digits amount, otherwise total digits
  compactFormat?: 'K' | 'M' | 'B';
}

export type CurrencyKeyData = NumberKeyData & {
  currencySymbol: string;
};

export type FormatKeyData = DateTimeKeyData | NumberKeyData | CurrencyKeyData;
