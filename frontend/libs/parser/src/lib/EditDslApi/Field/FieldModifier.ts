import { Reader } from '../utils';

/**
 * Represents a modifier attached to a field, such as `"key"` or `"dim"`.
 * A `FieldModifier` typically appears in the DSL before a field name, for example:
 *
 * ```dsl
 * key [a] = 1
 * ```
 */
export class FieldModifier {
  /**
   * The name of this modifier (e.g. `"key"`, `"dim"`, or other).
   */
  private _name: string;

  /**
   * A string appended after the modifier name in the DSL.
   */
  private _after = ' ';

  /**
   * Constructs a new `FieldModifier` with a given name.
   *
   * @param name - The modifier name, such as `"key"` or `"dim"`.
   */
  constructor(name: string) {
    this._name = name;
  }

  /**
   * Gets the modifier's current name.
   */
  public get name(): string {
    return this._name;
  }

  /**
   * Sets the modifier's name, triggering observer notifications.
   */
  public set name(value: string) {
    this._name = value;
  }

  /**
   * Converts this modifier to DSL format.
   *
   * @returns A DSL string representing this modifier.
   */
  public toDSL(): string {
    return `${this._name}${this._after}`;
  }

  /**
   * Reconstructs a `FieldModifier` from DSL using a Reader,
   * reading up to `span.to` for the modifier name and capturing any trailing text.
   *
   * @param reader - The reader containing DSL text and positional data.
   * @returns A fully populated `FieldModifier` instance.
   */
  public static deserialize(reader: Reader): FieldModifier {
    const result = new FieldModifier('');
    result._name = reader.next((d) => d.span.to);
    result._after = reader.beforeNext();

    return result;
  }
}
