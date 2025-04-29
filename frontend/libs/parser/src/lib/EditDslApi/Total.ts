import { lineBreak } from '../parser';
import { Field } from './Field';
import { notifyObserver, ObservableObserver, Reader } from './utils';

export class Total extends ObservableObserver {
  /**
   * Text that appears before the "total" keyword (often whitespace or comments).
   */
  private _before = '';

  /**
   * The prefix for this section, by default "total" plus a line break.
   */
  private _prefix = 'total' + lineBreak;

  /**
   * An array storing either raw text strings (e.g., unparsed snippets)
   * or actual {@link Field} objects in the order they appear in the DSL.
   */
  private _fields: Array<Field | string> = [];

  /**
   * Text that appears after all fields, often leftover content (whitespace or line breaks).
   */
  private _after = '';

  /**
   * A mapping of field names to their index in `_fields`, allowing quick lookups.
   */
  private _fieldIndices: Record<string, number> = {};

  /**
   * Constructs a new `Total` instance.
   */
  constructor() {
    super();
  }

  /**
   * Converts this total section (including prefix, fields, and trailing text)
   * back into a DSL string.
   *
   * @returns A DSL-formatted string representing this total section.
   */
  public toDSL(): string {
    return (
      this._before +
      this._prefix +
      this._fields
        .map((f) => (typeof f === 'string' ? f : f.toDSL()))
        .join('') +
      this._after
    );
  }

  /**
   * Retrieves a Field by its name.
   *
   * @param name - The name of the field to look up.
   * @returns The matching `Field` object.
   * @throws {Error} If the field is not found.
   */
  public getField(name: string): Field {
    const index = this.findField(name);
    if (index === -1) {
      throw new Error(`Field '${name}' not found`);
    }

    return this._fields[index] as Field;
  }

  /**
   * Adds a new field to the total section, triggering observer notifications.
   *
   * @param field - The {@link Field} object to add.
   * @throws {Error} If a field with the same name already exists.
   */
  @notifyObserver()
  public addField(field: Field): void {
    if (field.name in this._fieldIndices) {
      throw new Error(`Field '${field.name}' already exists`);
    }
    field.attach(this);
    this._fields.push(field);
    this._fieldIndices[field.name] = this._fields.length - 1;
  }

  /**
   * Removes and returns a field by name, triggering observer notifications.
   *
   * @param name - The name of the field to remove.
   * @returns The removed `Field` object.
   * @throws {Error} If the named field does not exist.
   */
  @notifyObserver()
  public removeField(name: string): Field {
    const index = this.findField(name);
    if (index === -1) {
      throw new Error(`Field '${name}' not found`);
    }
    const field = this._fields.splice(index, 1)[0] as Field;
    field.detach();
    this.updateFieldIndices();

    return field;
  }

  /**
   * Returns the index of a field in `_fields` by name, or -1 if not found.
   *
   * @param name - The field name to look for.
   */
  private findField(name: string): number {
    return this._fieldIndices[name] ?? -1;
  }

  /**
   * Enumerates the names of all fields in this total section.
   */
  public get fieldNames(): Iterable<string> {
    return function* (this: Total) {
      for (const f of this._fields) {
        if (f instanceof Field) {
          yield f.name;
        }
      }
    }.call(this);
  }

  /**
   * Enumerates all Field objects in this total section.
   */
  public get fields(): Iterable<Field> {
    return function* (this: Total) {
      for (const f of this._fields) {
        if (f instanceof Field) {
          yield f;
        }
      }
    }.call(this);
  }

  /**
   * Deserializes a `Total` object from the given Reader,
   * reading the prefix, fields (and any unparsed snippets),
   * leftover text, and rebuilding field indices.
   *
   * @param reader - A `Reader` positioned at a total section in the DSL.
   * @returns A fully populated `Total` instance.
   */
  public static deserialize(reader: Reader): Total {
    const result = new Total();

    // `_before`
    result._before = reader.next((d) => d.span.from);

    // read fields
    const fieldsData = reader.entity?.fields ?? [];
    if (fieldsData.length > 0) {
      // prefix ends where first field starts
      result._prefix = reader.next(fieldsData[0].span.from);
    } else {
      // no fields, read prefix up to final
      result._prefix = reader.next((d) => d.span.to);
    }

    // parse each field
    for (const fieldEntity of fieldsData) {
      const fieldReader = reader.withEntity(fieldEntity);

      // Possibly read unparsed snippet before the field
      const unparsed = fieldReader.nextUnparsed((d) => d.span.from);
      if (unparsed) {
        // e.g. store raw text + linebreak
        result._fields.push(unparsed + fieldReader.tillLinebreak());
      }

      // now parse the actual Field object
      const field = Field.deserialize(fieldReader);
      result._fields.push(field);
      field.attach(result);

      reader.position = fieldReader.position;
    }

    // leftover text
    result._after = reader.beforeNext();

    // rebuild indices
    result.updateFieldIndices();

    return result;
  }

  /**
   * Recomputes `_fieldIndices` by enumerating all actual fields in `_fields`.
   */
  private updateFieldIndices(): void {
    this._fieldIndices = {};
    this._fields.forEach((entry, idx) => {
      if (entry instanceof Field) {
        this._fieldIndices[entry.name] = idx;
      }
    });
  }
}
