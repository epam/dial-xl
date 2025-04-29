import { lineBreak } from '../../parser';
import { notifyObserver, ObservableNode, Reader } from '../utils';

/**
 * Represents a "filter" section in the DSL, containing a single filter formula.
 *
 * Example DSL snippet:
 * ```dsl
 * filter [field] = "value"
 * ```
 */
export class ApplyFilter extends ObservableNode {
  /**
   * Any text preceding the `filter` keyword, often whitespace or comments.
   */
  private _before = '';

  /**
   * The filter prefix, by default `"filter "`.
   */
  private _prefix = 'filter ';

  /**
   * The filter formula text.
   */
  private _formula = '';

  /**
   * Trailing text after the formula, typically a line break.
   */
  private _after = lineBreak;

  /**
   * Constructs a new `ApplyFilter` object with the given formula text.
   *
   * @param formula - The initial filter formula string.
   */
  constructor(formula: string) {
    super();
    this._formula = formula;
  }

  /**
   * Converts this filter section to DSL format, combining any leading text,
   * the `filter` prefix, the formula, and trailing text.
   *
   * @returns A DSL string representing this filter.
   */
  public toDSL(): string {
    return `${this._before}${this._prefix}${this._formula}${this._after}`;
  }

  /**
   * Gets the current filter formula.
   */
  public get formula(): string {
    return this._formula;
  }

  /**
   * Sets a new filter formula, triggering observer notifications.
   */
  @notifyObserver()
  public set formula(value: string) {
    this._formula = value;
  }

  /**
   * Deserializes an `ApplyFilter` from a Reader, reading any leading text,
   * the filter formula, and leftover text.
   *
   * @param reader - A `Reader` positioned at a filter section in the DSL.
   * @returns A new `ApplyFilter` instance with its formula parsed.
   */
  public static deserialize(reader: Reader): ApplyFilter {
    const result = new ApplyFilter('');
    // Text before the filter keyword
    result._before = reader.next((d) => d.span.from);

    const formulaEntity = reader.entity?.formula;
    if (formulaEntity) {
      // If we have a formula entity, the prefix ends where the formula starts
      result._prefix = reader.next(formulaEntity.span.from);
      result._formula = reader.next(formulaEntity.span.to);
    } else {
      // Otherwise read prefix up to the final
      result._prefix = reader.next((d) => d.span.to);
    }

    // Leftover text after the formula
    result._after = reader.beforeNext();

    return result;
  }
}
