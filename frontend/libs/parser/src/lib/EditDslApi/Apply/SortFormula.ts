import { lineBreak } from '../../parser';
import { Reader } from '../utils';

/**
 * Represents a single sort formula in the DSL, for example:
 *
 * ```dsl
 * sort [someField]
 * ```
 */
export class SortFormula {
  /**
   * Any text that appears before this formula (e.g., whitespace, commas).
   */
  private _before = '';

  /**
   * The actual text of the sort formula (e.g., `someField + 1`).
   */
  private _formula: string;

  /**
   * Text that follows the formula, typically a line break (`lineBreak`)
   * or a comma if multiple formulas are listed.
   */
  private _after = lineBreak;

  /**
   * Constructs a new SortFormula with the given formula text.
   *
   * @param formula - The initial formula text.
   */
  constructor(formula: string) {
    this._formula = formula;
  }

  /**
   * Converts this sort expression to DSL format by concatenating the
   * formula text with the trailing `_after` value.
   *
   * @returns A DSL-formatted string, e.g., `"someField + 1\n"`.
   */
  public toDSL(): string {
    return `${this._formula}${this._after}`;
  }

  /**
   * Gets the main sort formula text.
   */
  public get formula(): string {
    return this._formula;
  }

  /**
   * Sets the formula text for this sort expression.
   */
  public set formula(value: string) {
    this._formula = value;
  }

  /**
   * Gets the trailing text after the formula, typically a line break
   * or comma plus space (if multiple formulas exist).
   */
  public get after(): string {
    return this._after;
  }

  /**
   * Sets the trailing text for this formula, e.g., `", "` or a line break.
   */
  public set after(value: string) {
    this._after = value;
  }

  /**
   * Deserializes a `SortFormula` from a given Reader.
   *
   * @param reader - A `Reader` positioned at a sort formula in the DSL.
   * @returns A new `SortFormula` with `_before`, `_formula`, and `_after` set.
   */
  public static deserialize(reader: Reader): SortFormula {
    const result = new SortFormula('');
    result._before = reader.next((d) => d.span.from);
    result._formula = reader.next((d) => d.span.to);
    result._after = reader.tillLinebreak();

    return result;
  }
}
