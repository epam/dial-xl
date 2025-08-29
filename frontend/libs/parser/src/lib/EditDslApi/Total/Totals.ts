import { notifyObserver, ObservableObserver, validateIndex } from '../utils';
import { Total } from './Total';

/**
 * A container class for multiple Total objects, extending ObservableObserver
 * so that adding or removing Totals triggers observer notifications.
 */
export class Totals extends ObservableObserver {
  /**
   * The internal list of Totals.
   */
  private _totals: Total[] = [];

  /**
   * Constructs an empty `Totals` container.
   */
  constructor() {
    super();
  }

  /**
   * Returns the number of totals in this container.
   */
  public get length(): number {
    return this._totals.length;
  }

  /**
   * Provides iteration over the Totals in this container.
   */
  public [Symbol.iterator](): IterableIterator<Total> {
    let index = 0;
    const self = this;

    return {
      next(): IteratorResult<Total> {
        if (index < self._totals.length) {
          return { value: self._totals[index++], done: false };
        }

        return { value: undefined as unknown as Total, done: true };
      },
      [Symbol.iterator](): IterableIterator<Total> {
        return this;
      },
    };
  }

  /**
   * Retrieves a Total by zero-based index.
   * @param index - The index of the Total to retrieve.
   * @throws {Error} If the index is out of range.
   */
  public getItem(index: number): Total {
    this._validateTotalIndex(index);

    return this._totals[index];
  }

  /**
   * Sets the Total at a specified index.
   * @param index - The index where the new Total should be placed.
   * @param value - The new Total object.
   * @throws {Error} If the index is out of range.
   */
  @notifyObserver()
  public setItem(index: number, value: Total): void {
    this._validateTotalIndex(index);
    value.attach(this);
    const oldValue = this._totals[index];
    this._totals[index] = value;
    oldValue.detach();
  }

  /**
   * Removes the Total at a specified index.
   * @param index - The zero-based index of the Total to remove.
   * @returns The removed Total.
   * @throws {Error} If the index is out of range.
   */
  @notifyObserver()
  public deleteItem(index: number): Total {
    return this._removeTotal(index);
  }

  /**
   * Appends a new Total at the end of the list.
   * @param value - The new Total to add.
   */
  @notifyObserver()
  public append(value: Total): void {
    value.attach(this);
    this._totals.push(value);
  }

  /**
   * Inserts a new Total at a specified index.
   * @param index - The index at which to insert the Total.
   * @param value - The new Total to insert.
   * @throws {Error} If the index is out of range.
   */
  @notifyObserver()
  public insert(index: number, value: Total): void {
    this._validateTotalIndex(index);
    value.attach(this);
    this._totals.splice(index, 0, value);
  }

  /**
   * Removes and returns a Total from a specified index.
   * @param index - The zero-based index of the Total to remove.
   * @returns The removed Total.
   * @throws {Error} If the index is out of range.
   */
  @notifyObserver()
  public pop(index: number): Total {
    return this._removeTotal(index);
  }

  /**
   * Internally removes a Total at a given index.
   * @param index - The index of the Total to remove.
   * @returns The removed Total.
   * @throws {Error} If the index is out of range.
   */
  private _removeTotal(index: number): Total {
    this._validateTotalIndex(index);
    const total = this._totals.splice(index, 1)[0];
    total.detach();

    return total;
  }

  /**
   * Checks if the given index is valid for the current `_totals` list.
   * @param index - The index to validate.
   * @throws {Error} If the index is out of range.
   */
  private _validateTotalIndex(index: number): void {
    validateIndex(index, this._totals.length, 'Total');
  }
}
