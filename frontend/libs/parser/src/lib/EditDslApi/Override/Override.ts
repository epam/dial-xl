import { lineBreak } from '../../parser';
import { notifyObserver, ObservableNode, Reader } from '../utils';

/**
 * Represents a single cell (value entry) in an override row.
 * For instance, if an override row is `"1, 2, 3"`, each separate
 * cell (e.g., `"1"`, `"2"`, `"3"`) could be stored as an `_Override`.
 */
export class _Override {
  /** Text that appears before the override value (often whitespace or commas). */
  private _before = '';

  /** The actual override value. */
  private _value = '';

  /** Text that appears after the value. */
  private _after = lineBreak;

  /**
   * Constructs a new `_Override` instance with the given value string.
   *
   * @param value - The initial override value for this cell.
   */
  constructor(value: string) {
    this._value = value;
  }

  /**
   * Gets the current override value.
   */
  public get override(): string {
    return this._value;
  }

  /**
   * Sets the override value.
   */
  public set override(value: string) {
    this._value = value;
  }

  /**
   * Gets any trailing text after this override.
   */
  public get after(): string {
    return this._after;
  }

  /**
   * Sets the trailing text after this override.
   */
  public set after(value: string) {
    this._after = value;
  }

  /**
   * Converts this override cell to DSL format by concatenating
   * `_before`, `_value`, and `_after`.
   *
   * @returns A DSL string representing this single override cell.
   */
  public toDSL(): string {
    return `${this._before}${this._value}${this._after}`;
  }

  /**
   * Deserializes an `_Override` from a Reader, extracting prefix text,
   * the override value, and any leftover trailing text.
   *
   * @param reader - A `Reader` positioned at an override cell in the DSL.
   * @returns A new `_Override` instance reconstructed from the DSL.
   */
  public static deserialize(reader: Reader): _Override {
    const result = new _Override('');

    // Read text before the override value (often whitespace or commas).
    result._before = reader.next((d) => d.span.from);

    // Read the actual override value up to d.span.to.
    result._value = reader.next((d) => d.span.to);

    // Read leftover text (e.g., newline or trailing comma).
    result._after = reader.tillLinebreak();

    return result;
  }
}

/**
 * Represents a single row of override values keyed by field names, plus an optional
 * 'rowNumber' for additional context. For example, if an override row maps fields
 * "a" and "b" to values "123" and "456", this class stores them as `_values = { a: "123", b: "456" }`.
 */
export class Override extends ObservableNode {
  /**
   * A key/value map holding override values for each field name.
   * For instance, `{ "a": "123", "b": "456" }`.
   */
  private _values: Record<string, string>;

  /**
   * An optional row number for this override (e.g., if "row" was a special column).
   */
  private _rowNumber: string | null = null;

  /**
   * Constructs a new `Override` instance, optionally providing initial values and a row number.
   *
   * @param values - A map of field names to override values, or an empty object if omitted.
   * @param rowNumber - An optional string representing the row number for this override.
   */
  constructor(values?: Record<string, string>, rowNumber?: string | null) {
    super();
    this._values = values || {};
    this._rowNumber = rowNumber ?? null;
  }

  /**
   * Enumerates all field names that have override values in this object.
   */
  public get names(): Iterable<string> {
    return Object.keys(this._values);
  }

  /**
   * Gets the current row number, or `null` if none is set.
   */
  public get rowNumber(): string | null {
    return this._rowNumber;
  }

  /**
   * Sets or clears the row number, triggering observer notifications.
   *
   * @param value - A new row number string, or null to remove it.
   */
  @notifyObserver()
  public set rowNumber(value: string | null) {
    this._rowNumber = value;
  }

  /**
   * Retrieves the override value for a given field name.
   *
   * @param key - The field name to look up.
   * @returns The override value associated with `key`.
   */
  public getItem(key: string): string {
    return this._values[key];
  }

  /**
   * Sets or updates the override value for a given field name, triggering observer notifications.
   *
   * @param key - The field name to set.
   * @param value - The new override value for the field.
   */
  @notifyObserver()
  public setItem(key: string, value: string): void {
    this._values[key] = value;
  }

  /**
   * Deletes the override value for a given field name, triggering observer notifications.
   *
   * @param key - The field name to remove from this override.
   */
  @notifyObserver()
  public deleteItem(key: string): void {
    delete this._values[key];
  }
}
