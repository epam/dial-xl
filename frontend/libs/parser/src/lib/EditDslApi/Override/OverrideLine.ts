import { Reader } from '../utils';
import { _Override } from './Override';

/**
 * Represents a single row of overrides in the DSL. Each cell in
 * the row is an `_Override` object (e.g., `"1"`, `"2"`, `"3"`).
 */
export class OverrideLine {
  /** The list of `_Override` cells that make up this row. */
  private _overrides: _Override[];

  /**
   * Creates a new `OverrideLine` containing the given array of override cells.
   *
   * @param overrides - An array of `_Override` objects representing each cell in the row.
   */
  constructor(overrides: _Override[]) {
    this._overrides = overrides;
  }

  /**
   * Provides direct access to the array of `_Override` cells in this row.
   */
  public get overrides(): _Override[] {
    return this._overrides;
  }

  /**
   * Converts this entire override line to DSL format by concatenating
   * each `_Override` cell's DSL text.
   *
   * @returns A DSL string representing this entire row of override cells.
   */
  public toDSL(): string {
    return this._overrides.map((o) => o.toDSL()).join('');
  }

  /**
   * Deserializes an `OverrideLine` from a Reader, reading an array
   * of `_Override` cell definitions (e.g., values like `"1"`, `"2"`, etc.).
   *
   * @param reader - A `Reader` positioned at an array of override cells.
   * @returns A new `OverrideLine` containing all parsed cells.
   */
  public static deserialize(reader: Reader): OverrideLine {
    const overrides: _Override[] = [];

    // The reader.entity is assumed to be an array of cell entities.
    const arrayData = reader.entity ?? [];
    for (const valueEntity of arrayData) {
      const valueReader = reader.withEntity(valueEntity);
      const overrideObj = _Override.deserialize(valueReader);
      overrides.push(overrideObj);
      reader.position = valueReader.position;
    }

    return new OverrideLine(overrides);
  }
}
