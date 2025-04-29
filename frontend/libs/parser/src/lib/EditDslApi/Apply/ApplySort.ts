import { notifyObserver, ObservableObserver, Reader } from '../utils';
import { SortFormula } from './SortFormula';

/**
 * Represents a "sort" section in the DSL, containing one or more sort formulas.
 *
 * Example DSL snippet:
 * ```dsl
 * sort [fieldA], [fieldB]
 * ```
 */
export class ApplySort extends ObservableObserver {
  /**
   * Any text that appears before the `sort` keyword, often whitespace or comments.
   */
  private _before = '';

  /**
   * The `sort` prefix, by default `"sort "`.
   */
  private _prefix = 'sort ';

  /**
   * The array of parsed sort formulas (e.g., `fieldA ASC`, `fieldB DESC`),
   * each managed by a {@link SortFormula}.
   */
  private _formulas: SortFormula[] = [];

  /**
   * Any trailing text after all formulas, typically leftover whitespace or a newline.
   */
  private _after = '';

  constructor() {
    super();
  }

  /**
   * Converts this sort section into DSL format by concatenating:
   * `_before`, `_prefix`, each formula's DSL, and `_after`.
   */
  public toDSL(): string {
    return (
      `${this._before}` +
      `${this._prefix}` +
      this._formulas.map((f) => f.toDSL()).join('') +
      `${this._after}`
    );
  }

  /**
   * Returns how many sort formulas are currently stored.
   */
  public get length(): number {
    return this._formulas.length;
  }

  /**
   * Retrieves the text of a formula at the given index.
   *
   * @param index - The zero-based index of the formula.
   * @returns The formula string.
   */
  public getItem(index: number): string {
    return this._formulas[index].formula;
  }

  /**
   * Updates the formula text at the specified index, triggering observer notifications.
   *
   * @param index - Zero-based index of the formula to update.
   * @param value - The new formula text.
   */
  @notifyObserver()
  public setItem(index: number, value: string): void {
    this._formulas[index].formula = value;
  }

  /**
   * Deletes the formula at the specified index, triggering observer notifications.
   * If it was the last formula, its trailing `after` text is carried over to the new last formula.
   *
   * @param index - The zero-based index of the formula to remove.
   */
  @notifyObserver()
  public deleteItem(index: number): void {
    const formula = this._formulas.splice(index, 1)[0];
    // If the removed formula was the last, carry over its `after`
    if (index === this._formulas.length && this._formulas.length > 0) {
      this._formulas[this._formulas.length - 1].after = formula.after;
    }
  }

  /**
   * Appends a new sort formula to the end, triggering observer notifications.
   * If there's an existing formula, sets its `after` to `", "` before appending.
   *
   * @param value - The new formula text to append.
   */
  @notifyObserver()
  public append(value: string): void {
    if (this._formulas.length > 0) {
      this._formulas[this._formulas.length - 1].after = ', ';
    }
    this._formulas.push(new SortFormula(value));
  }

  /**
   * Provides an iterable of all formula strings.
   */
  public formulas(): Iterable<string> {
    return this._formulas.map((f) => f.formula);
  }

  /**
   * Deserializes an `ApplySort` from the given Reader,
   * reading `_before`, formulas, and leftover text.
   *
   * @param reader - A `Reader` positioned at a `sort` section in the DSL.
   * @returns A new `ApplySort` instance with parsed formulas.
   */
  public static deserialize(reader: Reader): ApplySort {
    const result = new ApplySort();
    result._before = reader.next((d) => d.span.from);

    const formulaEntities = reader.entity?.formulas ?? [];
    if (formulaEntities.length > 0) {
      // The prefix ends where the first formula starts
      result._prefix = reader.next(formulaEntities[0].span.from);
    } else {
      // Otherwise read up to the final
      result._prefix = reader.next((d) => d.span.to);
    }

    // Parse each formula
    for (const formulaEntity of formulaEntities) {
      const formulaReader = reader.withEntity(formulaEntity);
      const formula = SortFormula.deserialize(formulaReader);
      result._formulas.push(formula);
      reader.position = formulaReader.position;
    }

    // leftover text
    result._after = reader.beforeNext();

    return result;
  }
}
