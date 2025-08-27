import { lineBreak, totalKeyword } from '../../parser';
import { Field, FieldGroup, FieldGroups } from '../Field';
import { ObservableObserver, Reader } from '../utils';

export class Total extends ObservableObserver {
  /**
   * Text that appears before the "total" keyword (often whitespace or comments).
   */
  private _before = '';

  /**
   * The prefix for this section, by default "total" plus a line break.
   */
  private _prefix = totalKeyword + lineBreak;

  /**
   * A container holding all field groups.
   */
  private _fieldGroups: FieldGroups;

  /**
   * Text that appears after all fields, often leftover content (whitespace or line breaks).
   */
  private _after = '';

  /**
   * Constructs a new `Total` instance, initializing an empty `FieldGroups` container
   * and attaching it to this `Total` for observer notifications.
   */
  constructor() {
    super();
    this._fieldGroups = new FieldGroups();
    this._fieldGroups.attach(this);
  }

  /**
   * Converts this total section (including prefix, fields, and trailing text)
   * back into a DSL string.
   *
   * @returns A DSL-formatted string representing this total section.
   */
  public toDSL(): string {
    return (
      this._before + this._prefix + this._fieldGroups.toDSL() + this._after
    );
  }

  /**
   * Gets the container of field groups.
   */
  public get fieldGroups(): FieldGroups {
    return this._fieldGroups;
  }

  /**
   * Sets or replaces the entire `FieldGroups` container, reattaching observer logic.
   */
  public set fieldGroups(value: FieldGroups) {
    value.attach(this);
    this._fieldGroups.detach();
    this._fieldGroups = value;
  }

  /**
   * Adapter method.
   * Gets a field by name, searching among all field groups.
   * @param name - The name of the field to retrieve.
   */
  public getField(name: string): Field {
    for (let i = 0; i < this._fieldGroups.length; i++) {
      const group = this._fieldGroups.getItem(i);
      const index = group.fieldNames
        ? Array.from(group.fieldNames).indexOf(name)
        : -1;
      if (index !== -1) {
        return group.getField(name);
      }
    }
    throw new Error(`Unknown field: ${name}`);
  }

  /**
   * Adapter method.
   * Sets the formula for a field by name, searching among all field groups.
   * @param fieldName - The name of the field to update.
   * @param formula - The new formula to assign to the field.
   */
  public setFormula(fieldName: string, formula: string | null): void {
    for (let i = 0; i < this.fieldGroups.length; i++) {
      const group = this.fieldGroups.getItem(i);
      if (Array.from(group.fieldNames).includes(fieldName)) {
        group.formula = formula;

        return;
      }
    }
    throw new Error(
      `Field '${fieldName}' not found in any FieldGroup of this Total.`
    );
  }

  /**
   * Adapter method.
   * Adds a new Field to this Total by creating a new FieldGroup with one field and the given formula.
   */
  public addField(fieldName: string, formula?: string): void {
    const newField = new Field(fieldName);
    const newGroup = FieldGroup.fromField(newField, formula ?? null);
    this.fieldGroups.append(newGroup);
  }

  /**
   * Adapter method.
   * Removes a Field by name, searching among all field groups. If the group becomes empty,
   * the entire group is removed from this Total.
   */
  public removeField(fieldName: string): void {
    for (let i = 0; i < this.fieldGroups.length; i++) {
      const group = this.fieldGroups.getItem(i);
      const names = Array.from(group.fieldNames);
      if (names.includes(fieldName)) {
        group.removeField(fieldName);
        if (group.fieldCount === 0) {
          this.fieldGroups.deleteItem(i);
        }

        return;
      }
    }
    throw new Error(
      `Field '${fieldName}' not found in any FieldGroup of this Total.`
    );
  }

  /**
   * Deserializes a `Total` object from the given Reader, reading any `fields` data
   * (parsed by `FieldGroups.deserialize`) plus leftover text.
   *
   * @param reader - A `Reader` positioned at a `total` section in the DSL.
   * @returns A new `Total` instance populated with field groups.
   */
  public static deserialize(reader: Reader): Total {
    const result = new Total();

    // Read any text before "total"
    result._before = reader.next((d) => d.span.from);

    // Possibly read fields
    const fields = reader.entity?.fields ?? [];
    if (fields.length > 0) {
      // The prefix ends where the first field data begins
      result._prefix = reader.next(fields[0].span.from);
    } else {
      // If no fields, read prefix up to line break
      result._prefix = reader.tillLinebreak();
    }

    // Let the `FieldGroups` handle parsing the field data
    result.fieldGroups = FieldGroups.deserialize(reader);

    // Read leftover text after the field groups
    result._after = reader.next((d) => d.span.to);

    return result;
  }
}
