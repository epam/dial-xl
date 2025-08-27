/**
 * Ensures the given index is within the valid range [0, end).
 *
 * @param index - The current index to validate.
 * @param end - The exclusive upper bound for valid indices.
 * @param name - A descriptive label used in the error message.
 * @throws {Error} If the index is out of range.
 */
export function validateIndex(index: number, end: number, name: string): void {
  if (index < 0 || index >= end) {
    throw new Error(
      `${name} index ${index} is out of bounds: valid indices start from 0, ` +
        `the current range is [0, ${end}).`
    );
  }
}
