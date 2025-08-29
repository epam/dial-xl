/** Maximum characters we are ever allowed to show. */
const maxWidth = 10;

/**
 * Try to produce a scientific string that:
 *  – has a 1‑digit mantissa with 0‑4 fractional digits
 *  – has an exponent with ≤ 3 digits
 *  – fits into `cellLimit`
 *
 * If no candidate fits, the raw value is returned
 */
const convertToExponential = (value: number, cellLimit: number): string => {
  for (let frac = 4; frac >= 0; frac--) {
    const exp = value
      .toExponential(frac)
      .replace('e', 'E')
      .replace('+', '')
      .replace(/E(-?)0+(\d)/, 'E$1$2'); // strip leading zeros

    const digit = exp.split('E')[0];
    const exponentDigits = Math.abs(Number(exp.split('E')[1])).toString()
      .length;
    if (exponentDigits > 3) continue; // |exp| must be ≤ 999

    if (exp.length <= cellLimit && !digit?.endsWith('0')) return exp; // first fit wins
  }

  return value.toString();
};

/** `toFixed` wrapper that inserts comma‑grouping (en‑US locale). */
const toLocaleFixed = (val: number, fractionDigits: number): string =>
  val.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    useGrouping: true,
  });

/** True if `text.length` does not exceed `limit`. */
const fits = (text: string, limit: number): boolean => text.length <= limit;

/**
 * Compact “human‑readable” formatter: 1K /1M /1B.
 * Returns an empty string if no compact form meets the global / cell limits.
 */
const convertToBigLetterNotation = (
  value: number,
  cellLimit: number
): string => {
  let divisor = 0;
  let modifier: 'K' | 'M' | 'B' | undefined;

  if (Math.abs(value) >= 1e9) {
    divisor = 1e9;
    modifier = 'B';
  } else if (Math.abs(value) >= 1e6) {
    divisor = 1e6;
    modifier = 'M';
  } else if (Math.abs(value) >= 1e3) {
    divisor = 1e3;
    modifier = 'K';
  }

  if (!modifier) return '';

  // initial candidate with one fractional digit
  let mantissa = (value / divisor).toFixed(1);
  if (mantissa.endsWith('.0')) mantissa = mantissa.slice(0, -2);

  let candidate = mantissa + modifier;

  // If too wide, try integer mantissa (no decimals)
  if (
    (candidate.length >= maxWidth || candidate.length > cellLimit) &&
    mantissa.includes('.')
  ) {
    mantissa = Math.round(Number(mantissa)).toString();
    candidate = mantissa + modifier;
  }

  if (candidate.length >= maxWidth) return '';

  const initialFrac = mantissa.split('.')[1]?.length ?? 0;
  mantissa = toLocaleFixed(Number(mantissa), initialFrac);
  candidate = mantissa + modifier;

  return fits(candidate, cellLimit) ? candidate : '';
};

/**
 * Format `sourceValue` so that it fits in a column of `columnWidth`px.
 *
 * @param sourceValue   Raw string from the API (may be in scientific form).
 * @param columnWidth   Pixels available for the cell.
 * @param symbolWidth   Glyph width in the column’s font (px).
 *
 * @returns A display string, or a row of `#`
 *          characters when nothing can be rendered in the available space.
 */
export const formatNumberGeneral = (
  sourceValue: string,
  columnWidth: number,
  symbolWidth: number
): string | undefined => {
  try {
    const value = Number(sourceValue);
    if (isNaN(value)) return sourceValue;

    const cellLimit = Math.floor(columnWidth / symbolWidth);

    /* tiny numbers -> scientific */
    if (Math.abs(value) < 1e-7) {
      const exp = convertToExponential(value, cellLimit);

      return fits(exp, cellLimit) ? exp : '#'.repeat(cellLimit);
    }

    /* plain form with grouping */
    const initialFrac = value.toString().split('.')[1]?.length ?? 0;
    let plain = toLocaleFixed(value, initialFrac);
    if (plain.endsWith('.0')) plain = plain.slice(0, -2); // normalise

    const digitCount = plain.replace(/[^0-9]/g, '').length;
    if (digitCount <= maxWidth && fits(plain, cellLimit)) return plain;

    /* fractional trimming */
    for (let f = initialFrac - 1; f >= 0; f--) {
      plain = toLocaleFixed(value, f);
      if (plain.endsWith('.0')) plain = plain.slice(0, -2);

      // If rounding killed every digit (=> 0), fall through to scientific.
      if (Number(plain.replace(/,/g, '')) === 0) break;

      const digits = plain.replace(/[^0-9]/g, '').length;
      if (digits <= maxWidth && fits(plain, cellLimit)) return plain;
    }

    /* K/M/B notation */
    const compact = convertToBigLetterNotation(value, cellLimit);
    if (compact) return compact;

    /* exponential fallback  */
    const exp = convertToExponential(value, cellLimit);
    if (fits(exp, cellLimit)) return exp;

    /* placeholder fallback */
    return '#'.repeat(Math.max(0, cellLimit));
  } catch {
    return undefined;
  }
};
