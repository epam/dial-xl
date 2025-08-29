/**
 * Represents a dynamically generated field within a table. Unlike regular fields,
 * a dynamic field might be created based on computation or data not originally
 * in the static DSL (e.g., pivot results etc.).
 */
export class DynamicField {
  /**
   * The identifying name of this dynamic field.
   */
  private readonly _name: string;

  /**
   * Constructs a new DynamicField with the given name.
   *
   * @param name - The name for this dynamic field.
   */
  constructor(name: string) {
    this._name = name;
  }

  /**
   * Gets the name of this dynamic field.
   */
  public get name(): string {
    return this._name;
  }
}
