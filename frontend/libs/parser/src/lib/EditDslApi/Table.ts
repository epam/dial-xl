import { lineBreak, tableKeyword } from '../parser';
import { escapeTableName, unescapeTableName } from '../services';
import { Apply } from './Apply';
import { Decorator } from './Decorator';
import { DocLine, DocString } from './DocString';
import { Field } from './Field';
import { DynamicField } from './Field/DynamicField';
import { Overrides } from './Override';
import { Total } from './Total';
import { Event, notifyObserver, ObservableObserver, Reader } from './utils';

/**
 * Represents a table definition within the DSL. It can contain:
 * - Documentation lines (docString)
 * - Decorators (e.g., `!size(2)`)
 * - Fields (which may themselves have modifiers, decorators, etc.)
 * - Overrides (an `override` block)
 *
 * This class extends ObservableObserver, allowing it to observe changes
 * on children (fields, decorators) and also notify its own parent observer (e.g. a `Sheet`).
 */
export class Table extends ObservableObserver {
  /** Text that might precede the table definition in the DSL. */
  private _before = '';

  /** An optional doc string containing comment lines for this table. */
  private _docString: DocString;

  /** A list of decorator objects attached directly to this table. */
  private _decorators: Decorator[] = [];

  /** The prefix used when writing to DSL. */
  private _prefix = tableKeyword + ' ';

  /** The escaped name of this table. */
  private _name: string;

  /** A string that appears after the table name. */
  private _afterName = lineBreak;

  /** An array of fields or raw text strings. */
  private _fields: Array<Field | string> = [];

  /** An array of apply blocks or totals. */
  private _applyTotals: Array<Apply | Total> = [];

  /** An optional override block associated with this table. */
  private _overrides: Overrides | null = null;

  /** A string that appears after all table content (fields, overrides). */
  private _after = '';

  /** A mapping of dynamic fields by name (e.g., pivot-generated fields). */
  private _dynamicFields: Record<string, DynamicField> = {};

  /**
   * A name-to-index map of fields for quick lookup. Updated whenever fields are added or removed.
   */
  private _fieldIndices: Record<string, number> = {};

  /** The index of the apply block, if any. */
  private _applyIndex: number | null = null;

  /** A flag indicating whether to add an empty line before the table. */
  private _emptyLineBefore = false;

  /**
   * A name-to-index map of decorators for quick lookup. Updated whenever decorators are added or removed.
   */
  private _decoratorIndices: Record<string, number> = {};

  /**
   * Constructs a new Table with the given name, escaping it for DSL output.
   *
   * @param name - The table name (unescaped).
   * @param emptyLineBefore - Whether to add an empty line before the table.
   */
  constructor(name: string, emptyLineBefore = false) {
    super();
    this._name = escapeTableName(name);
    this._emptyLineBefore = emptyLineBefore;

    // Initialize the doc string with an empty array of lines
    // and a factory that produces normal DocLine objects.
    this._docString = new DocString([], (text) => new DocLine(text));
  }

  /**
   * Gets the unescaped table name for display or logic purposes.
   */
  public get name(): string {
    return unescapeTableName(this._name);
  }

  /**
   * Sets the table name, escaping it internally for DSL usage
   * and triggering observer notifications.
   */
  @notifyObserver()
  public set name(value: string) {
    this._name = escapeTableName(value);
  }

  /**
   * Gets the `Apply` object if present, otherwise `null`.
   */
  public get apply(): Apply | null {
    return this._applyIndex !== null
      ? (this._applyTotals[this._applyIndex] as Apply)
      : null;
  }

  /**
   * Sets or removes the `Apply` object via `_setIndexedNode`.
   *
   * @param value - The new Apply object or null to remove.
   */
  @notifyObserver()
  public set apply(value: Apply | null) {
    this._applyIndex = this.setIndexedNode(
      value,
      this._applyTotals,
      this._applyIndex
    );
  }

  /**
   * Retrieves a `Total` object by 1-based index.
   *
   * @param index - 1-based index of the total to get.
   * @throws If the index is out of range.
   */
  public getTotal(index: number): Total {
    return this._applyTotals[this._totalIndex(index - 1)] as Total;
  }

  /**
   * Adds a new `Total` at the end of `_applyTotals`.
   *
   * @param value - The new Total object to attach.
   */
  @notifyObserver()
  public addTotal(value: Total): void {
    value.attach(this);
    this._applyTotals.push(value);
  }

  /**
   * Removes and returns a `Total` from `_applyTotals` by 1-based index.
   * Adjusts `_applyIndex` if needed.
   *
   * @param index - 1-based index of the total to remove.
   * @returns The removed Total object.
   */
  @notifyObserver()
  public removeTotal(index: number): Total {
    const removeIndex = this._totalIndex(index - 1);
    const total = this._applyTotals.splice(removeIndex, 1)[0] as Total;
    total.detach();

    // If we removed a total before the apply index, adjust apply index
    if (this._applyIndex !== null && removeIndex < this._applyIndex) {
      this._applyIndex--;
    }

    return total;
  }

  /**
   * Removes any "empty" totals from the table
   */
  @notifyObserver()
  public cleanUpTotals(): void {
    const indexesToRemove: number[] = [];

    for (let i = 0; i < this._applyTotals.length; i++) {
      const item = this._applyTotals[i];
      if (item instanceof Total) {
        const totalFieldCount = Array.from(item.fields).length;
        if (totalFieldCount === 0) {
          indexesToRemove.push(i);
        }
      }
    }

    indexesToRemove.reverse().forEach((idx) => {
      const removedItem = this._applyTotals.splice(idx, 1)[0];
      if (this._applyIndex !== null && idx < this._applyIndex) {
        this._applyIndex!--;
      }

      if (removedItem.observer === this) {
        removedItem.detach();
      }
    });
  }

  /**
   * Converts a 0-based `index` for totals into the correct position in `_applyTotals`
   * (skipping the `_applyIndex` if it exists).
   *
   * @param index - 0-based total index (after subtracting 1 externally).
   * @throws If `index` is negative, meaning the total index is out of bounds.
   */
  private _totalIndex(index: number): number {
    if (index < 0) {
      throw new Error(
        `Total index ${
          index + 1
        } is out of bounds: valid indices start from 1, ` +
          `but the current range is [1, ${this.totalCount}].`
      );
    }

    // If there's no Apply set OR the total is before the Apply, index is the same.
    // If the total is after the Apply, shift by 1.
    return this._applyIndex === null || index < this._applyIndex
      ? index
      : index + 1;
  }

  /**
   * Returns how many totals exist (excluding the single Apply).
   */
  public get totalCount(): number {
    return this._applyIndex === null
      ? this._applyTotals.length
      : this._applyTotals.length - 1;
  }

  /**
   * Iterates over all `Total` objects, skipping the `Apply` object if present.
   */
  public get totals(): Iterable<Total> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    return (function* () {
      for (let i = 0; i < self._applyTotals.length; i++) {
        if (i !== self._applyIndex) {
          yield self._applyTotals[i] as Total;
        }
      }
    })();
  }

  /**
   * Gets the optional override block for this table.
   */
  public get overrides(): Overrides | null {
    return this._overrides;
  }

  /**
   * Sets or removes the override block, attaching or detaching it from this table
   * and triggering observer notifications.
   */
  @notifyObserver()
  public set overrides(value: Overrides | null) {
    if (this._overrides) {
      this._overrides.detach();
    }
    this._overrides = value;
    if (this._overrides) {
      this._overrides.attach(this);
    }
  }

  /** Get flag indicating if an empty line should be added before the table. */
  public get emptyLineBefore(): boolean {
    return this._emptyLineBefore;
  }

  /** Set flag indicating if an empty line should be added before the table. */
  public set emptyLineBefore(value: boolean) {
    this._emptyLineBefore = value;
  }

  /**
   * Converts this table and all its contents (doc string, decorators, fields, overrides, etc.)
   * back into DSL text.
   *
   * @returns A DSL string representing this table.
   */
  public toDSL(): string {
    return (
      `${this._before}` +
      `${this._docString.toDSL()}` +
      `${this._decorators.map((dec) => dec.toDSL()).join('')}` +
      `${this._prefix}` +
      `${this._name}` +
      `${this._afterName}` +
      `${this._fields
        .map((f) => (typeof f === 'string' ? f : f.toDSL()))
        .join('')}` +
      `${
        this._applyTotals
          ? this._applyTotals.map((at) => at.toDSL()).join('')
          : ''
      }` +
      `${this._overrides ? this._overrides.toDSL() : ''}` +
      `${this._after}`
    );
  }

  /**
   * Gets the current doc string text.
   */
  public get docString(): string | null {
    return <string>this._docString.text;
  }

  /**
   * Sets the doc string text. If set to `null`, clears all doc lines.
   */
  public set docString(value: string | null) {
    this._docString.text = value;
  }

  /**
   * Finds a field by name.
   *
   * @param name - The field name to search for.
   * @throws {Error} If the field does not exist in this table.
   * @returns The matching Field object.
   */
  public getField(name: string): Field {
    const index = this.findFieldIndex(name);
    if (index === -1) {
      throw new Error(`Field '${name}' not found`);
    }

    return this._fields[index] as Field;
  }

  /**
   * Adds a field to this table, attaching it for observer notifications.
   *
   * @param field - The field object to add.
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
   * Removes a field from this table by name, detaching it from observer notifications.
   *
   * @param name - The field name to remove.
   * @returns The removed field instance.
   */
  @notifyObserver()
  public removeField(name: string): Field {
    const index = this.findFieldIndex(name);
    if (index === -1) {
      throw new Error(`Field '${name}' not found`);
    }
    const field = this._fields.splice(index, 1)[0] as Field;
    field.detach();
    this.updateFieldIndices();

    return field;
  }

  /**
   * Swaps the positions of two fields by name within the table's field array,
   * updating the index mapping accordingly.
   *
   * @param name1 - The name of the first field.
   * @param name2 - The name of the second field.
   * @throws {Error} If either field does not exist.
   */
  @notifyObserver()
  public swapFields(name1: string, name2: string): void {
    const index1 = this.findFieldIndex(name1);
    const index2 = this.findFieldIndex(name2);
    if (index1 === -1) {
      throw new Error(`Field '${name1}' not found`);
    }
    if (index2 === -1) {
      throw new Error(`Field '${name2}' not found`);
    }
    // Swap in the array
    [this._fields[index1], this._fields[index2]] = [
      this._fields[index2],
      this._fields[index1],
    ];
    // Swap in the index map
    [this._fieldIndices[name1], this._fieldIndices[name2]] = [
      this._fieldIndices[name2],
      this._fieldIndices[name1],
    ];
  }

  /**
   * Move source field before or after target field.
   *
   * @param sourceFieldName - The name of the field to move.
   * @param targetFieldName - The name of the field to move before, or `null` to move to the end.
   * @param isBefore - Whether to move the field before the target field.
   * @throws {Error} If either field does not exist.
   */
  @notifyObserver()
  public moveFieldBeforeOrAfter(
    sourceFieldName: string,
    targetFieldName: string | null,
    isBefore: boolean
  ): void {
    const sourceIndex = this.findFieldIndex(sourceFieldName);
    if (sourceIndex === -1) {
      throw new Error(`Field '${sourceFieldName}' not found`);
    }

    const sourceField = this._fields.splice(sourceIndex, 1)[0];

    if (targetFieldName === null) {
      this._fields.push(sourceField);
    } else {
      let targetIndex = this.findFieldIndex(targetFieldName);
      if (targetIndex === -1) {
        throw new Error(`Target field '${targetFieldName}' not found`);
      }

      if (isBefore) {
        if (sourceIndex < targetIndex) {
          targetIndex--;
        }
      } else {
        if (sourceIndex > targetIndex) {
          targetIndex++;
        }
      }

      this._fields.splice(targetIndex, 0, sourceField);
    }

    this.updateFieldIndices();
  }

  /**
   * Looks up the index of a field by name in `_fieldIndices`.
   *
   * @param name - The field name to search for.
   */
  private findFieldIndex(name: string): number {
    return this._fieldIndices[name] ?? -1;
  }

  /**
   * Enumerates all field objects (excluding raw string segments) in this table.
   */
  public get fields(): Field[] {
    return this._fields.filter((f): f is Field => f instanceof Field);
  }

  /**
   * Retrieves a decorator by name.
   *
   * @param name - The decorator name to find.
   * @returns The matching Decorator.
   */
  public getDecorator(name: string): Decorator {
    const index = this.findDecoratorIndex(name);
    if (index === -1) {
      throw new Error(`Decorator '${name}' not found`);
    }

    return this._decorators[index];
  }

  /**
   * Adds a decorator to this table, attaching it for observer notifications.

   *
   * @param decorator - The Decorator to add.
   */
  @notifyObserver()
  public addDecorator(decorator: Decorator): void {
    if (decorator.name in this._decoratorIndices) {
      throw new Error(`Decorator '${decorator.name}' already exists`);
    }
    decorator.attach(this);
    this._decorators.push(decorator);
    this._decoratorIndices[decorator.name] = this._decorators.length - 1;
  }

  /**
   * Removes a decorator from this table by name, detaching it from observer notifications.
   *
   * @param name - The decorator name to remove.
   * @returns The removed Decorator.
   */
  @notifyObserver()
  public removeDecorator(name: string): Decorator {
    const index = this.findDecoratorIndex(name);
    if (index === -1) {
      throw new Error(`Decorator '${name}' not found`);
    }
    const decorator = this._decorators.splice(index, 1)[0];
    decorator.detach();
    this.updateDecoratorIndices();

    return decorator;
  }

  /**
   * Looks up the index of a decorator by name in `_decoratorIndices`.
   *
   * @param name - The name of the decorator to search for.
   */
  private findDecoratorIndex(name: string): number {
    return this._decoratorIndices[name] ?? -1;
  }

  /**
   * Enumerates the names of all decorators attached to this table.
   */
  public get decoratorNames(): string[] {
    return this._decorators.map((d) => d.name);
  }

  /**
   * Enumerates all decorator objects attached to this table.
   */
  public get decorators(): Decorator[] {
    return this._decorators;
  }

  /**
   * Retrieves a dynamic field by name. Throws an error if it does not exist.
   *
   * @param name - The name of the dynamic field.
   * @returns The matching DynamicField.
   */
  public getDynamicField(name: string): DynamicField {
    if (!this._dynamicFields[name]) {
      throw new Error(`Dynamic field '${name}' not found`);
    }

    return this._dynamicFields[name];
  }

  /**
   * Enumerates the names of all dynamic fields attached to this table.
   */
  public get dynamicFieldNames(): string[] {
    return Object.keys(this._dynamicFields);
  }

  /**
   * Enumerates all dynamic fields attached to this table.
   */
  public get dynamicFields(): DynamicField[] {
    return Object.values(this._dynamicFields);
  }

  /**
   * Replaces all dynamic fields with a new set.
   *
   * @param dynamicFields - An array of new dynamic fields to store.
   */
  public setDynamicFields(dynamicFields: DynamicField[]): void {
    this._dynamicFields = dynamicFields.reduce((acc, field) => {
      acc[field.name] = field;

      return acc;
    }, {} as Record<string, DynamicField>);
  }

  /**
   * Called before child modifications or property changes in this table.
   * Notifies our own observer (e.g. a `Sheet`), then handles rename events for fields
   * and decorators.
   *
   * @param event - The event describing the pending change.
   */
  override notifyBefore(event: Event): void {
    // Bubble up to our observer (the parent, e.g. a `Sheet`)
    if (this.observer) {
      this.observer.notifyBefore(event);
    }

    const args = event.kwargs['args'];

    if (args.length === 0) return;

    const sender = event.sender;
    if (
      sender instanceof Decorator &&
      event.methodName === 'name' &&
      // If the decorator's observer is `this` table
      sender.observer === this
    ) {
      this.onDecoratorRename(sender.name, args[0]);
    } else if (sender instanceof Field && event.methodName === 'name') {
      this.onFieldRename(sender.name, args[0]);
    }
  }

  /**
   * Handles a field renaming event, updating `_fieldIndices` so the new name is recognized.
   *
   * @param oldName - The old field name.
   * @param newName - The new field name.
   */
  private onFieldRename(oldName: string, newName: string): void {
    const index = this.findFieldIndex(oldName);
    if (index === -1) {
      throw new Error(`Field '${oldName}' not found`);
    }
    if (newName in this._fieldIndices) {
      throw new Error(`Field '${newName}' already exists`);
    }
    this._fieldIndices[newName] = this._fieldIndices[oldName];
    delete this._fieldIndices[oldName];
  }

  /**
   * Handles a decorator renaming event, updating `_decoratorIndices` so the new name is recognized.
   *
   * @param oldName - The old decorator name.
   * @param newName - The new decorator name.
   */
  private onDecoratorRename(oldName: string, newName: string): void {
    const index = this.findDecoratorIndex(oldName);
    if (index === -1) {
      throw new Error(`Decorator '${oldName}' not found`);
    }
    if (newName in this._decoratorIndices) {
      throw new Error(`Decorator '${newName}' already exists`);
    }
    this._decoratorIndices[newName] = this._decoratorIndices[oldName];
    delete this._decoratorIndices[oldName];
  }

  /**
   * Rebuilds the `_decoratorIndices` map by enumerating the current decorators.
   */
  private updateDecoratorIndices(): void {
    this._decoratorIndices = {};
    this._decorators.forEach((decor, idx) => {
      this._decoratorIndices[decor.name] = idx;
    });
  }

  /**
   * Rebuilds the `_fieldIndices` map by enumerating the current fields (ignoring raw string entries).
   */
  private updateFieldIndices(): void {
    this._fieldIndices = {};
    this._fields.forEach((f, idx) => {
      if (f instanceof Field) {
        this._fieldIndices[f.name] = idx;
      }
    });
  }

  /**
   * Deserializes a `Table` from a Reader, reading doc lines, decorators, fields,
   * overrides, and trailing text. Rebuilds internal indices afterwards.
   *
   * @param reader - The reader positioned at a table definition in the DSL.
   * @returns A fully reconstructed `Table` instance.
   */
  public static deserialize(reader: Reader): Table {
    // Create a temporary table with an empty name, then fill in fields
    const result = new Table('');
    // `_before`
    result._before = reader.next((d) => d.span.from);

    // doc_string (docs)
    const docEntities = reader.entity?.docs ?? [];
    if (docEntities.length > 0) {
      const docs: DocLine[] = [];
      for (const docEntity of docEntities) {
        const docReader = reader.withEntity(docEntity);
        const docLine = DocLine.deserialize(docReader);
        docs.push(docLine);
        reader.position = docReader.position;
      }
      result._docString = new DocString(docs, (text) => new DocLine(text));
    }

    // decorators
    const decoratorEntities = reader.entity?.decorators ?? [];
    for (const decoratorEntity of decoratorEntities) {
      const decoratorReader = reader.withEntity(decoratorEntity);
      const decorator = Decorator.deserialize(decoratorReader);
      result._decorators.push(decorator);
      decorator.attach(result);
      reader.position = decoratorReader.position;
    }

    // prefix, table name, after_name
    result._prefix = reader.next((d) => d.name.span.from);
    result._name = reader.next((d) => d.name.span.to);
    result._afterName = reader.tillLinebreak();

    // fields
    const fieldEntities = reader.entity?.fields ?? [];
    for (const fieldEntity of fieldEntities) {
      const fieldReader = reader.withEntity(fieldEntity);
      // Possibly a snippet before the field
      const unparsed = fieldReader.nextUnparsed((d) => d.span.from);
      if (unparsed) {
        result._fields.push(unparsed + fieldReader.tillLinebreak());
      }
      // Now the actual field
      const field = Field.deserialize(fieldReader);
      result._fields.push(field);
      field.attach(result);
      reader.position = fieldReader.position;
    }

    // apply & totals
    const applyTotalEntities: any[] = [];

    const applyEntity = reader.entity?.apply;
    if (applyEntity) {
      applyTotalEntities.push(applyEntity);
    }

    const totalsEntities = reader.entity?.totals ?? [];
    for (const totalEntity of totalsEntities) {
      applyTotalEntities.push(totalEntity);
    }

    // apply and totals can be written in any order
    applyTotalEntities.sort((a, b) => a.span.from - b.span.from);

    for (const applyTotalEntity of applyTotalEntities) {
      if (applyTotalEntity === applyEntity) {
        const applyReader = reader.withEntity(applyEntity);
        const applyObj = Apply.deserialize(applyReader);
        result._applyIndex = result._applyTotals.length;
        result._applyTotals.push(applyObj);
        applyObj.attach(result);
        reader.position = applyReader.position;
      } else {
        const totalReader = reader.withEntity(applyTotalEntity);
        const totalObj = Total.deserialize(totalReader);
        result._applyTotals.push(totalObj);
        totalObj.attach(result);
        reader.position = totalReader.position;
      }
    }

    // overrides
    const overridesEntity = reader.entity?.overrides;
    if (overridesEntity) {
      const overridesReader = reader.withEntity(overridesEntity);
      const overrides = Overrides.deserialize(overridesReader);
      result._overrides = overrides;
      overrides.attach(result);
      reader.position = overridesReader.position;
    }

    // after
    result._after = reader.next((d) => d.span.to);

    // Rebuild indices
    result.updateDecoratorIndices();
    result.updateFieldIndices();

    return result;
  }
}
