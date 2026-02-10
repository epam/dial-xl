import { lineBreak } from '../../parser';

/**
 * A helper class to read DSL ranges.
 */
export class Reader {
  public dsl: string;
  public allPositions: number[];
  public entity: any;
  public position: number;

  constructor(
    dsl: string,
    allPositions: number[],
    entity: any,
    position: number
  ) {
    this.dsl = dsl;
    this.allPositions = allPositions;
    this.entity = entity;
    this.position = position;
  }

  /**
   * Reads text up to the position returned by `to(entity)`,
   * trimming trailing whitespace from the end.
   */
  public nextUnparsed(to: (entity: any) => number): string {
    const nextPosition = to(this.entity);
    // Find the last non-whitespace character before nextPosition
    let unparsedEnd = this.position;
    for (let i = nextPosition - 1; i >= this.position; i--) {
      if (!/\s/.test(this.dsl[i])) {
        unparsedEnd = i + 1;
        break;
      }
    }

    const result = this.dsl.substring(this.position, unparsedEnd);
    this.position = unparsedEnd;

    return result;
  }

  /**
   * Reads text from the current position up to `to`, which can be either
   * a number or a function returning a number.
   */
  public next(to: number | ((entity: any) => number)): string {
    const nextPosition = typeof to === 'number' ? to : to(this.entity);
    const result = this.dsl.substring(this.position, nextPosition);
    this.position = nextPosition;

    return result;
  }

  /**
   * Reads text from the current position to the next relevant "break" in `allPositions`
   */
  public beforeNext(): string {
    const index = bisectLeft(this.allPositions, this.position);
    const nextPosition =
      index < this.allPositions.length
        ? this.allPositions[index]
        : this.position;

    const result = this.dsl.substring(this.position, nextPosition);
    this.position = nextPosition;

    return result;
  }

  /**
   * Reads text from the current position until the next line break,
   * or until the next "stop" position in `allPositions`, depending
   * on `stop_on_text`.
   */
  public tillLinebreak(stopOnText = false): string {
    const stop = this.getStop(stopOnText);
    const index = this.dsl.indexOf(lineBreak, this.position) + 1; // +1 to include the newline
    const endOfLine = index > 0 && index <= stop ? index : stop;

    const result = this.dsl.substring(this.position, endOfLine);
    this.position = endOfLine;

    return result;
  }

  /**
   * Returns a new Reader instance with the same DSL, positions, and
   * position index, but a different `entity`.
   */
  public withEntity(entity: any): Reader {
    return new Reader(this.dsl, this.allPositions, entity, this.position);
  }

  /**
   * Internal helper to calculate where reading should stop
   * for `till_linebreak`.
   */
  private getStop(stopOnText: boolean): number {
    if (stopOnText) {
      // Find the first non-whitespace character from current position
      // or use the end of the DSL if none is found
      for (let i = this.position; i < this.dsl.length; i++) {
        if (!/\s/.test(this.dsl[i])) {
          return i;
        }
      }

      return this.dsl.length;
    } else {
      const index = bisectRight(this.allPositions, this.position);

      return index < this.allPositions.length
        ? this.allPositions[index]
        : this.position;
    }
  }
}

/**
 * Returns the index at which `x` should be inserted into `arr`
 * (which is assumed to be sorted) in order to maintain sorted order.
 * If `x` is already present in `arr`, the insertion point will be
 * to the left of any existing entries.
 *
 * @param arr - A sorted array of numbers.
 * @param x - The value to insert.
 * @returns The insertion index, an integer in the range [0, arr.length].
 */
function bisectLeft(arr: number[], x: number): number {
  let low = 0;
  let high = arr.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (arr[mid] < x) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

/**
 * Returns the index at which `x` should be inserted into `arr`
 * (which is assumed to be sorted) in order to maintain sorted order.
 * If `x` is already present in `arr`, the insertion point will be
 * to the right of any existing entries.
 *
 * @param arr - A sorted array of numbers.
 * @param x - The value to insert.
 * @returns The insertion index, an integer in the range [0, arr.length].
 */
function bisectRight(arr: number[], x: number): number {
  let low = 0;
  let high = arr.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (arr[mid] <= x) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}
