import { notifyObserver, ObservableObserver, Reader } from '../utils';
import { FieldGroup } from './FieldGroup';

/**
 * A container class for multiple FieldGroup objects,
 * Each FieldGroup is tracked by an internal array and an index map.
 */
export class FieldGroups extends ObservableObserver {
  /**
   * The underlying storage of items, which may be a mix of string snippets or FieldGroup instances.
   */
  private _fieldGroups: Array<FieldGroup | string> = [];

  /**
   * Tracks the indexes of actual FieldGroup objects within `_fieldGroups`.
   */
  private _fieldGroupIndices: number[] = [];

  /**
   * Constructs an empty `FieldGroups` container.
   */
  constructor() {
    super();
  }

  /**
   * Converts the field groups to a DSL.
   *
   * @returns The combined DSL representation of all items in `_fieldGroups`.
   */
  public toDSL(): string {
    return this._fieldGroups
      .map((item) => (typeof item === 'string' ? item : item.toDSL()))
      .join('');
  }

  /**
   * Returns how many actual FieldGroup objects are stored.
   *
   * @returns The number of `FieldGroup` items.
   */
  public get length(): number {
    return this._fieldGroupIndices.length;
  }

  /**
   * Provides an iterator over all FieldGroup items in the order they appear,
   * skipping any string entries.
   */
  public [Symbol.iterator](): IterableIterator<FieldGroup> {
    const self = this;
    let current = 0;

    return {
      next(): IteratorResult<FieldGroup> {
        if (current < self._fieldGroupIndices.length) {
          const arrIndex = self._fieldGroupIndices[current++];
          const group = self._fieldGroups[arrIndex] as FieldGroup;

          return { value: group, done: false };
        }

        return { value: undefined as unknown as FieldGroup, done: true };
      },
      [Symbol.iterator](): IterableIterator<FieldGroup> {
        return this;
      },
    };
  }

  /**
   * Retrieves a FieldGroup by zero-based index in the list of groups,
   * throwing if out of range.
   *
   * @param index - The zero-based index among actual field groups (not raw strings).
   * @throws {Error} If the index is out of bounds.
   * @returns The matching FieldGroup.
   */
  public getItem(index: number): FieldGroup {
    index = this.toGroupIndex(index);

    return this._fieldGroups[index] as FieldGroup;
  }

  /**
   * Replaces the FieldGroup at the given index, detaching the old group
   * and attaching the new one. Triggers observer notifications.
   *
   * @param index - The zero-based index among field groups.
   * @param value - The new FieldGroup to set.
   * @throws {Error} If the index is out of bounds.
   */
  @notifyObserver()
  public setItem(index: number, value: FieldGroup): void {
    index = this.toGroupIndex(index);
    value.attach(this);

    const actualIdx = this._fieldGroupIndices[index];
    const oldValue = this._fieldGroups[actualIdx] as FieldGroup;
    this._fieldGroups[actualIdx] = value;
    oldValue.detach();
  }

  /**
   * Removes the FieldGroup at the specified index, detaching it.
   * Triggers observer notifications.
   *
   * @param index - The zero-based index among field groups.
   * @returns The removed FieldGroup.
   * @throws {Error} If the index is out of bounds.
   */
  @notifyObserver()
  public deleteItem(index: number): FieldGroup {
    return this.removeGroup(index);
  }

  /**
   * Appends a new FieldGroup at the end of `_fieldGroups`. Triggers observer notifications.
   *
   * @param value - The FieldGroup to add.
   */
  @notifyObserver()
  public append(value: FieldGroup): void {
    value.attach(this);
    this._fieldGroupIndices.push(this._fieldGroups.length);
    this._fieldGroups.push(value);
  }

  /**
   * Inserts a new FieldGroup before the group at the specified index, pushing it forward.
   * Triggers observer notifications.
   *
   * @param index - The zero-based index among field groups where to insert.
   * @param value - The FieldGroup to insert.
   * @throws {Error} If the index is out of bounds.
   */
  @notifyObserver()
  public insert(index: number, value: FieldGroup): void {
    index = this.toGroupIndex(index);
    value.attach(this);

    this._fieldGroups.splice(index, 0, value);

    this.updateFieldGroupIndices();
  }

  /**
   * Removes and returns a FieldGroup by index.
   * Triggers observer notifications.
   *
   * @param index - The zero-based index among field groups.
   * @returns The removed FieldGroup.
   * @throws {Error} If the index is out of bounds.
   */
  @notifyObserver()
  public pop(index: number): FieldGroup {
    return this.removeGroup(index);
  }

  /**
   * Internally removes a FieldGroup at the given index from `_fieldGroups`,
   * detaching it and re-building `_fieldGroupIndices`.
   *
   * @param index - The zero-based index among field groups.
   * @returns The removed FieldGroup.
   * @throws {Error} If the index is out of bounds.
   */
  private removeGroup(index: number): FieldGroup {
    index = this.toGroupIndex(index);
    const fieldGroup = this._fieldGroups.splice(index, 1)[0] as FieldGroup;
    fieldGroup.detach();
    this.updateFieldGroupIndices();

    return fieldGroup;
  }

  /**
   * Ensures the given index is valid for the current list of field groups.
   *
   * @param index - The zero-based index of the group to check.
   * @throws {Error} If the index is out of range.
   */
  public toGroupIndex(index: number): number {
    if (index < 0 || index >= this._fieldGroupIndices.length) {
      throw new Error(`The field group number ${index} does not exist.`);
    }

    return this._fieldGroupIndices[index];
  }

  /**
   * Re-computes `_fieldGroupIndices` by scanning `_fieldGroups` for actual FieldGroup items.
   * This should be called whenever we add, remove, or reorder field groups in `_fieldGroups`.
   */
  private updateFieldGroupIndices(): void {
    this._fieldGroupIndices = [];
    this._fieldGroups.forEach((item, idx) => {
      if (item instanceof FieldGroup) {
        this._fieldGroupIndices.push(idx);
      }
    });
  }

  /**
   * Deserializes a `FieldGroups` object by reading field group definitions (and raw snippets)
   * from the given reader. Each group is appended to `result`.
   *
   * @param reader - A `Reader` positioned where field definitions begin in the DSL.
   * @returns A fully constructed `FieldGroups` instance with all field groups parsed.
   */
  public static deserialize(reader: Reader): FieldGroups {
    const result = new FieldGroups();

    const fieldsData = reader.entity?.fields ?? [];
    for (const fieldEntity of fieldsData) {
      const fieldReader = reader.withEntity(fieldEntity);

      // Possibly read an unparsed snippet
      const unparsed = fieldReader.nextUnparsed((d) => d.span.from);
      if (unparsed) {
        result._fieldGroups.push(unparsed + fieldReader.tillLinebreak());
      }

      // Now parse an actual FieldGroup
      const fieldGroup = FieldGroup.deserialize(fieldReader);
      result._fieldGroups.push(fieldGroup);
      fieldGroup.attach(result);

      reader.position = fieldReader.position;
    }

    result.updateFieldGroupIndices();

    return result;
  }
}
