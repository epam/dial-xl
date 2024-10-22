import { escapeChar, stringShouldBeEscapedChars } from '../parser';

export function escapeName(
  name: string,
  shouldBeEscapedChars: string[],
  fullSanitize: boolean
) {
  let escapedTableName = '';
  let isCharEscaped = false;
  for (let i = 0; i < name.length; i++) {
    const symbol = name.charAt(i);
    const nextSymbol = name.charAt(i + 1);

    if (shouldBeEscapedChars.includes(symbol) && !isCharEscaped) {
      if (symbol !== escapeChar) {
        escapedTableName += escapeChar + symbol;
        isCharEscaped = false;
        continue;
      }

      if (!fullSanitize && shouldBeEscapedChars.includes(nextSymbol)) {
        escapedTableName += symbol;
        isCharEscaped = true;
        continue;
      }

      escapedTableName += escapeChar + symbol;
      isCharEscaped = false;
      continue;
    }

    escapedTableName += symbol;
    isCharEscaped = false;
  }

  return escapedTableName;
}

export function escapeOverrideValue(
  value: string | number,
  fullSanitize = false,
  ignoreNumberType = false
): string {
  if (
    !ignoreNumberType &&
    (typeof value === 'number' || isFinite(value as any))
  ) {
    return value.toString();
  }
  const initialValue = typeof value === 'number' ? value.toString() : value;

  const hasLeadingQuote = initialValue.startsWith("'");
  const hasTrailingQuote = initialValue.endsWith("'");
  let sanitizedValue = initialValue;

  if (hasLeadingQuote || hasTrailingQuote) {
    sanitizedValue = sanitizedValue.slice(
      hasLeadingQuote ? 1 : 0,
      hasTrailingQuote ? -1 : sanitizedValue.length
    );
  }

  return `"${escapeName(
    sanitizedValue,
    stringShouldBeEscapedChars,
    fullSanitize
  )}"`;
}

export function unescapeOverrideValue(name: string): string {
  const shouldBeUnquoted = name.startsWith('"') && name.endsWith('"');
  let resultName = shouldBeUnquoted ? name.slice(1, -1) : name;

  const preparedEscapedChars = stringShouldBeEscapedChars
    .map((char) => '\\' + char)
    .join('');
  const regEx = new RegExp(
    String.raw`(.)?(['])([${preparedEscapedChars}])`,
    'g'
  );
  resultName = resultName.replaceAll(regEx, '$1$3');

  return resultName;
}
