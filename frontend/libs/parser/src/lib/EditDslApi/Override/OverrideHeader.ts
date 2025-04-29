import { lineBreak } from '../../parser';
import { Reader } from '../utils';

/**
 * Represents the header portion of an override definition, typically indicating
 * the name of a column or field in an override block.
 *
 * For example, in a DSL snippet like:
 *
 * ```dsl
 * override
 * row,[a],[b]
 * 1,2,3
 * ```
 *
 * each header (e.g. `"row"`, `"[a]"`, `"[b]"`) can be stored as an `OverrideHeader`.
 */
export class OverrideHeader {
  /** Any text that appears before this header name in the DSL (e.g. spacing or commas). */
  private _before = '';

  /** The actual header name (e.g., `"row"`, `"[a]"`, etc.). */
  private _name: string;

  /** Any text that follows this header name. */
  private _after = lineBreak;

  /**
   * Creates a new `OverrideHeader` with the specified name.
   *
   * @param name - The initial header name.
   */
  constructor(name: string) {
    this._name = name;
  }

  /**
   * Gets the text that appears before this header name.
   */
  public get before(): string {
    return this._before;
  }

  /**
   * Gets the header name (e.g. `"row"`, `"[a]"`).
   */
  public get name(): string {
    return this._name;
  }

  /**
   * Sets the header name.
   */
  public set name(value: string) {
    this._name = value;
  }

  /**
   * Gets the text that follows this header name, typically a newline.
   */
  public get after(): string {
    return this._after;
  }

  /**
   * Sets the trailing text after this header name (e.g. commas, newlines).
   */
  public set after(value: string) {
    this._after = value;
  }

  /**
   * Converts this header to DSL format by concatenating `_before`, `_name`, and `_after`.
   *
   * @returns The DSL string representation of this header.
   */
  public toDSL(): string {
    return `${this._before}${this._name}${this._after}`;
  }

  /**
   * Deserializes an `OverrideHeader` from the given Reader, extracting
   * the prefix (`_before`), the header name, and any trailing text.
   *
   * @param reader - A `Reader` positioned at a header definition in the DSL.
   * @returns A fully reconstructed `OverrideHeader`.
   */
  public static deserialize(reader: Reader): OverrideHeader {
    const result = new OverrideHeader('');
    result._before = reader.next((d) => d.span.from);
    result._name = reader.next((d) => d.span.to);
    result._after = reader.tillLinebreak();

    return result;
  }
}
