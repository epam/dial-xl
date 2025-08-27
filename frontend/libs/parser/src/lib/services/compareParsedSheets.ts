import isEqual from 'react-fast-compare';

import { ParsedSheet } from '../ParsedSheet';

/**
 * Deep-compare just the `tables` part of two ParsedSheets maps.
 * Added due to react-fast-compare cannot handle circular refs in editableSheet.
 *
 * @param a first map: Record<sheetName, ParsedSheet>
 * @param b second map: Record<sheetName, ParsedSheet>
 * @returns `true` when both maps contain the same sheet names and for
 *          every sheet those two `tables` arrays are deeply equal
 */
export function isParsedSheetsEqual(
  a: Record<string, ParsedSheet>,
  b: Record<string, ParsedSheet>
): boolean {
  const namesA = Object.keys(a);
  const namesB = Object.keys(b);

  // Same sheet set
  if (namesA.length !== namesB.length) return false;
  for (const name of namesA)
    if (!Object.prototype.hasOwnProperty.call(b, name)) return false;

  // Same tables per sheet
  for (const name of namesA) {
    if (!isEqual(a[name].tables, b[name].tables)) return false;
  }

  return true;
}
