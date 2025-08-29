import { lineBreak } from '../../parser';
import {
  Event,
  notifyObserver,
  ObservableObserver,
  Reader,
  validateIndex,
} from '../utils';
import { Field } from './Field';

/**
 * Represents a group of fields sharing an optional formula at the end.
 *
 * This class stores multiple fields, separator and a possible formula string.
 */
export class FieldGroup extends ObservableObserver {
  /**
   * Text that appears before the group of fields.
   */
  private _before = '  ';

  /**
   * A list of actual field objects in this group.
   */
  private _fields: Field[] = [];

  /**
   * A string inserted between the fields and the formula.
   */
  private _separator = ' = ';

  /**
   * The optional formula string that applies to all fields in the group.
   */
  private _formula: string | null;

  /**
   * Text appended after the entire group.
   */
  private _after = lineBreak;

  /**
   * Maps field names to their indices in `_fields`.
   */
  private _fieldIndices: Record<string, number> = {};

  /**
   * Constructs a new FieldGroup.
   *
   * @param formula - An optional formula string for this group, or null if none.
   */
  constructor(formula: string | null) {
    super();
    this._formula = formula;
  }

  /**
   * Converts this field group to DSL format.
   *
   * @returns A DSL-formatted string representing this group.
   */
  public toDSL(): string {
    if (this._fields.length === 0) {
      // throw new Error('List of fields is empty');
      return `${this._before}${this._after}`;
    }

    const fieldsDSL = this._fields.map((f) => f.toDSL()).join('');
    const formulaPart =
      this._formula == null ? '' : this._separator + this._formula;

    return `${this._before}${fieldsDSL}${formulaPart}${this._after}`;
  }

  /**
   * Gets the optional formula string for this group.
   */
  public get formula(): string | null {
    return this._formula;
  }

  /**
   * Sets the formula string for this group, triggering observer notifications.
   */
  @notifyObserver()
  public set formula(value: string | null) {
    this._formula = value;
  }

  /**
   * Checks whether this group contains a field with the given name.
   *
   * @param name - The name of the field to look for.
   * @returns True if the field is present, otherwise false.
   */
  public hasField(name: string): boolean {
    return this.findField(name) !== -1;
  }

  /**
   * Retrieves a field by name, throwing if not found.
   *
   * @param name - The name of the field to retrieve.
   * @returns The matching Field object.
   * @throws {Error} If no field with the given name exists in this group.
   */
  public getField(name: string): Field {
    const index = this.findField(name);
    if (index === -1) {
      throw new Error(`Field '${name}' not found`);
    }

    return this._fields[index];
  }

  /**
   * Retrieves a field by index, throwing if out of bounds.
   * @param index - The zero-based index of the field to retrieve.
   */
  public getFieldByIndex(index: number): Field {
    if (index < 0 || index >= this._fields.length) {
      throw new Error(`Field with index ${index} not found`);
    }

    return this._fields[index];
  }

  /**
   * Adds a new field to this group, attaching it for observer notifications
   * and optionally prefixing the field with a comma if there's already at least one field.
   *
   * @param field - The Field object to add.
   * @throws {Error} If a field with the same name already exists.
   */
  @notifyObserver()
  public addField(field: Field): Field {
    if (field.name in this._fieldIndices) {
      throw new Error(`Field '${field.name}' already exists`);
    }

    field.attach(this);

    // If there's at least one field, prefix with ", "
    const fieldCount = this._fields.length;
    if (fieldCount > 0) {
      field.setBefore(', ');
    }

    this._fieldIndices[field.name] = fieldCount;
    this._fields.push(field);

    return field;
  }

  /**
   * Inserts a new field at the specified index.
   *
   * @param index - The zero-based position at which to insert the field.
   * @param field - The field object to be inserted.
   * @throws {Error} If the index is out of the valid range.
   */
  @notifyObserver()
  public insertField(index: number, field: Field): void {
    validateIndex(index, this._fields.length, 'Field');
    field.attach(this);

    // If inserting at 0 and there's already at least one field,
    // give the current first field a comma.
    if (index === 0 && this._fields.length > 0) {
      this._fields[0].setBefore(', ');
    } else if (index > 0) {
      // Otherwise, the new field gets the comma before itself.
      field.setBefore(', ');
    }

    this._fields.splice(index, 0, field);
    this.updateFieldIndices();
  }

  /**
   * Removes a field by name, detaching it. If the removed field
   * was not the last, clears the next field's `_before` property.
   *
   * @param name - The field name to remove.
   * @throws {Error} If the named field is not found.
   */
  @notifyObserver()
  public removeField(name: string): Field {
    const index = this.findField(name);
    if (index === -1) {
      throw new Error(`Field '${name}' not found`);
    }

    const field = this._fields.splice(index, 1)[0];
    field.detach();
    field.setBefore('');

    if (index === 0 && this._fields.length > 0) {
      this._fields[index].setBefore('');
    }

    this.updateFieldIndices();

    return field;
  }

  /**
   * Enumerates the names of all fields in this group.
   */
  public get fieldNames(): Iterable<string> {
    const self = this;

    return (function* () {
      for (const f of self._fields) {
        yield f.name;
      }
    })();
  }

  /**
   * Swap the positions of two fields in this group.
   * @param iRight - The index of the first field.
   * @param iLeft - The index of the second field.
   */
  public swapFieldPositions(iRight: number, iLeft: number): void {
    if (iRight === iLeft) return;
    const [f1, f2] = [this._fields[iRight], this._fields[iLeft]];
    this.removeField(f1.name);
    this.removeField(f2.name);

    if (iLeft >= this.fieldCount) {
      this.addField(f1);
    } else {
      this.insertField(iLeft, f1);
    }

    if (iRight >= this.fieldCount) {
      this.addField(f2);
    } else {
      this.insertField(iRight, f2);
    }
  }

  /**
   * Enumerates all actual Field objects in this group.
   */
  public get fields(): Iterable<Field> {
    const self = this;

    return (function* () {
      for (const f of self._fields) {
        yield f;
      }
    })();
  }

  /**
   * The number of fields in this group.
   */
  public get fieldCount(): number {
    return Object.keys(this._fields).length;
  }

  /**
   * Called before modifications to child fields.
   * We intercept field rename events here.
   *
   * @param event - The pending change event.
   */
  override notifyBefore(event: Event): void {
    if (this.observer) {
      this.observer.notifyBefore(event);
    }

    const sender = event.sender;
    if (sender instanceof Field && event.methodName === 'name') {
      this.onFieldRename(sender.name, event.kwargs['value']);
    }
  }

  /**
   * Handles a field renaming, ensuring that the old name is removed from `_fieldIndices`
   * and the new name is added, throwing if the new name already exists.
   *
   * @param oldName - The old field name.
   * @param newName - The new field name.
   */
  private onFieldRename(oldName: string, newName: string): void {
    const index = this.findField(oldName);
    if (
      index === -1 ||
      newName in this._fieldIndices ||
      Object.keys(this._fieldIndices).length !== this._fields.length
    ) {
      this.updateFieldIndices();

      return;
    }

    this._fieldIndices[newName] = this._fieldIndices[oldName];
    delete this._fieldIndices[oldName];
  }

  /**
   * Finds a field's index by name, or -1 if not found.
   *
   * @param name - The field name to look for.
   */
  private findField(name: string): number {
    return this._fieldIndices[name] ?? -1;
  }

  /**
   * Rebuilds `_fieldIndices` based on the current order of `_fields`.
   */
  private updateFieldIndices(): void {
    this._fieldIndices = {};
    this._fields.forEach((fld, idx) => {
      this._fieldIndices[fld.name] = idx;
    });
  }

  /**
   * Creates a new `FieldGroup` containing a single Field plus a formula.
   *
   * @param field - The Field to add.
   * @param formula - A formula string for this group.
   * @returns A newly constructed FieldGroup with one field and the given formula.
   */
  public static fromField(field: Field, formula: string | null): FieldGroup {
    const result = new FieldGroup(formula);
    result.addField(field);

    return result;
  }

  /**
   * Deserializes a `FieldGroup` from the given `Reader`, building
   * `_fields` with optional formula logic.
   *
   * @param reader - A `Reader` pointing to a field group in the DSL.
   * @returns A new `FieldGroup` instance.
   */
  public static deserialize(reader: Reader): FieldGroup {
    const result = new FieldGroup(null);

    // read anything up to the first field
    result._before = reader.next((d) => d.span.from);

    const fieldsData = reader.entity?.fields ?? [];
    for (const fieldEntity of fieldsData) {
      const fieldReader = reader.withEntity(fieldEntity);
      // parse an actual field
      const field = Field.deserialize(fieldReader);
      result._fields.push(field);
      field.attach(result);

      reader.position = fieldReader.position;
    }

    const formula = reader.entity?.formula;
    if (formula) {
      result._separator = reader.next(formula.span.from);
      result._formula = reader.next(formula.span.to);
    }

    result._after = reader.tillLinebreak();
    result.updateFieldIndices();

    return result;
  }
}
