import { data } from 'currency-codes';
import getSymbolFromCurrency from 'currency-symbol-map';
// List taken from here https://unicode-explorer.com/articles/cryptocurrency-unicode-symbols
export const cryptoCurrencies = [
  {
    currency: 'Bitcoin',
    code: 'BTC',
    symbol: '₿',
  },
  {
    currency: 'Ethereum',
    code: 'ETH',
    symbol: 'Ξ',
  },
  {
    currency: 'Tether',
    code: 'USDT',
    symbol: '₮',
  },
  {
    currency: 'Cardano',
    code: 'ADA',
    symbol: '₳',
  },
  {
    currency: 'XRP',
    code: 'XRP',
    symbol: '✕',
  },
  {
    currency: 'Solana',
    code: 'SOL',
    symbol: '◎',
  },
  {
    currency: 'Polkadot',
    code: 'DOT',
    symbol: '●',
  },
  {
    currency: 'Dogecoin',
    code: 'DOGE',
    symbol: 'Ð',
  },
  {
    currency: 'Dai',
    code: 'DAI',
    symbol: '◈',
  },
  {
    currency: 'Litecoin',
    code: 'LTC',
    symbol: 'Ł',
  },
  {
    currency: 'Algorand',
    code: 'ALGO',
    symbol: 'Ⱥ',
  },
  {
    currency: 'Bitcoin Cash',
    code: 'BCH',
    symbol: 'Ƀ',
  },
  {
    currency: 'Pepe',
    code: 'PEPE',
    symbol: '🐸︎',
  },
  {
    currency: 'ECOMI',
    code: 'OMI',
    symbol: 'Ο',
  },
  {
    currency: 'Internet Computer',
    code: 'ICP',
    symbol: '∞',
  },
  {
    currency: 'Ethereum Classic',
    code: 'ETC',
    symbol: 'ξ',
  },
  {
    currency: 'Monero',
    code: 'XMR',
    symbol: 'ɱ',
  },
  {
    currency: 'Tezos',
    code: 'XTZ',
    symbol: 'ꜩ',
  },
  {
    currency: 'Iota',
    code: 'MIOTA',
    symbol: 'ɨ',
  },
  {
    currency: 'EOS',
    code: 'EOS',
    symbol: 'ε',
  },
  {
    currency: 'Bitcoin SV',
    code: 'BSV',
    symbol: 'Ɓ',
  },
  {
    currency: 'Maker',
    code: 'MKR',
    symbol: 'Μ',
  },
  {
    currency: 'Zcash',
    code: 'ZEC',
    symbol: 'ⓩ',
  },
  {
    currency: 'Dash',
    code: 'DASH',
    symbol: 'Đ',
  },
  {
    currency: 'Nano',
    code: 'XNO',
    symbol: 'Ӿ',
  },
  {
    currency: 'Augur',
    code: 'REP',
    symbol: 'Ɍ',
  },
  {
    currency: 'Steem',
    code: 'STEEM',
    symbol: 'ȿ',
  },
];

export const getCurrencies = () => {
  const currencies = data.map((item) => ({
    currency: item.currency,
    code: item.code,
    symbol: getSymbolFromCurrency(item.code) ?? item.code,
  }));

  const sortedCurrencies = currencies
    .concat(cryptoCurrencies)
    .sort((a, b) => a.currency.localeCompare(b.currency));

  return sortedCurrencies;
};

export const getGroupedCurrencies = () => {
  const currencies = getCurrencies();
  const mainCurrencies = [
    'USD',
    'EUR',
    'CHF',
    'GBP',
    'AUD',
    'JPY',
    'CAD',
    'CNY',
    'BTC',
    'ETH',
    'XRP',
  ];

  const currenciesMapped = currencies
    .filter((currency) =>
      mainCurrencies.some((mainCurrency) => mainCurrency === currency.code),
    )
    .reduce(
      (acc, curr) => {
        acc[curr.code] = curr;

        return acc;
      },
      {} as Record<
        string,
        {
          currency: string;
          code: string;
          symbol: string;
        }
      >,
    );
  const resultedMainCurrencies = mainCurrencies
    .map((currency) => currenciesMapped[currency])
    .filter(Boolean);

  return {
    mainCurrencies: resultedMainCurrencies,
    otherCurrencies: currencies.filter((currency) =>
      mainCurrencies.every((mainCurrency) => mainCurrency !== currency.code),
    ),
  };
};

export const getCurrencySymbols = () => {
  return getCurrencies().map((item) => item.symbol);
};
