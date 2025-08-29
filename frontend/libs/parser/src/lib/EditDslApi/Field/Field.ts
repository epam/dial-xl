import { dimKeyword, keyKeyword } from '../../parser';
import { escapeFieldName, unescapeFieldName } from '../../services';
import { Decorator, FieldDecorator } from '../Decorator';
import { DocString, FieldDocLine } from '../DocString';
import { Event, notifyObserver, ObservableObserver, Reader } from '../utils';
import { FieldModifier } from './FieldModifier';

/**
 * Represents a single field definition within a table.
 */
export class Field extends ObservableObserver {
  /** Spacing or text that precedes this field in the DSL. */
  private _before = '';

  /** A doc string containing any documentation lines attached to this field. */
  private _docString: DocString;

  /** An array of field-specific decorators, each wrapped in a FieldDecorator. */
  private _decorators: FieldDecorator[] = [];

  /** A list of modifiers (key, dim, etc.) that appear before the field name. */
  private _modifiers: FieldModifier[] = [];

  /** The escaped field name, e.g. `"[fieldName]"`. */
  private _name: string;

  /**
   * A map of decorator names to their index in `_decorators`.
   * Updated whenever decorators are added or removed.
   */
  private _decoratorIndices: Record<string, number> = {};

  /**
   * Constructs a new Field instance with the given name and optional formula.
   *
   * @param name - The initial field name (unescaped).
   */
  constructor(name: string) {
    super();
    this._name = escapeFieldName(name, true, true);
    this._docString = new DocString([], (text) => new FieldDocLine(text));
  }

  /**
   * Internal method to set `_before`, e.g. changing indentation or comma logic.
   *
   * @param value - The new `_before` string.
   */
  public setBefore(value: string): void {
    this._before = value;
  }

  /**
   * Indicates whether this field has a "key" modifier.
   */
  public get key(): boolean {
    return this.findModifier(keyKeyword) !== -1;
  }

  /**
   * Enables or disables the "key" modifier, triggering observer notifications.
   */
  @notifyObserver()
  public set key(value: boolean) {
    this.setModifier(keyKeyword, value);
  }

  /**
   * Indicates whether this field has a "dim" modifier.
   */
  public get dim(): boolean {
    return this.findModifier(dimKeyword) !== -1;
  }

  /**
   * Enables or disables the "dim" modifier, triggering observer notifications.
   */
  @notifyObserver()
  public set dim(value: boolean) {
    this.setModifier(dimKeyword, value);
  }

  /**
   * A helper to enable or disable a named modifier (e.g., `key` or `dim`).
   *
   * @param name - The modifier name to set or unset.
   * @param value - `true` to add the modifier, `false` to remove it.
   */
  private setModifier(name: string, value: boolean): void {
    const index = this.findModifier(name);
    const currentlyPresent = index !== -1;

    if (currentlyPresent === value) {
      return;
    }

    if (value) {
      this._modifiers.push(new FieldModifier(name));
    } else {
      this._modifiers.splice(index, 1);
    }
  }

  /**
   * Finds the zero-based index of a named modifier in `_modifiers`, or -1 if not found.
   *
   * @param name - The modifier name to look for.
   * @returns The index or -1 if not found.
   */
  private findModifier(name: string): number {
    return this._modifiers.findIndex((m) => m.name === name);
  }

  /**
   * Gets the unescaped name of this field.
   */
  public get name(): string {
    return unescapeFieldName(this._name, true);
  }

  /**
   * Sets the field name, escaping it internally for DSL usage
   * and triggering observer notifications.
   */
  @notifyObserver()
  public set name(value: string) {
    this._name = escapeFieldName(value, true, true);
  }

  /**
   * Retrieves the doc string text for this field, or null if there are no lines.
   */
  public get docString(): string {
    return <string>this._docString.text;
  }

  /**
   * Sets the doc string text. If set to null, clears all documentation lines
   * and triggering observer notifications.
   *
   * @param value - The new doc string content, or null to remove all lines.
   */
  @notifyObserver()
  public set docString(value: string | null) {
    this._docString.text = value;
  }

  /**
   * Retrieves a decorator by name. Throws an error if no matching decorator is found.
   *
   * @param name - The name of the decorator to find.
   * @returns The underlying Decorator object.
   */
  public getDecorator(name: string): Decorator {
    const index = this.findDecorator(name);
    if (index === -1) {
      throw new Error(`Decorator '${name}' not found`);
    }

    return this._decorators[index].decorator;
  }

  /**
   * Adds a new decorator to the field, triggering observer notifications.
   *
   * @param decorator - The Decorator object to attach.
   * @throws {Error} If a decorator with the same name already exists on this field.
   */
  @notifyObserver()
  public addDecorator(decorator: Decorator): void {
    if (decorator.name in this._decoratorIndices) {
      throw new Error(`Decorator '${decorator.name}' already exists`);
    }

    decorator.attach(this);
    this._decoratorIndices[decorator.name] = this._decorators.length;
    this._decorators.push(new FieldDecorator(decorator));
  }

  /**
   * Inserts a decorator at a specified position within this field’s decorator list.
   *
   * @param index - The zero-based index at which to insert the new decorator.
   * @param decorator - The decorator instance to insert.
   * @throws {Error} If the index is out of bounds.
   */
  @notifyObserver()
  public insertDecorator(index: number, decorator: Decorator): void {
    if (index < 0 || index >= this._decorators.length) {
      throw new Error(
        `Decorator index ${index} is out of bounds: valid indices start from 0, the current range is [0, ${this._decorators.length}).`
      );
    }

    decorator.attach(this);
    const fieldDecorator = new FieldDecorator(decorator);
    this._decorators.splice(index, 0, fieldDecorator);
    this.updateDecoratorIndices();
  }

  /**
   * Removes a decorator by name, triggering observer notifications.
   *
   * @param name - The name of the decorator to remove.
   * @returns The removed Decorator instance.
   * @throws {Error} If the decorator is not found.
   */
  @notifyObserver()
  public removeDecorator(name: string): Decorator {
    const index = this.findDecorator(name);
    if (index === -1) {
      throw new Error(`Decorator '${name}' not found`);
    }

    const fieldDecorator = this._decorators.splice(index, 1)[0];
    fieldDecorator.decorator.detach();
    this.updateDecoratorIndices();

    return fieldDecorator.decorator;
  }

  /**
   * Checks whether this field has a decorator with the given name.
   * @param name - The decorator name to look for.
   * @returns True if a decorator with this name exists on the field; otherwise false.
   */
  public hasDecorator(name: string): boolean {
    return name in this._decoratorIndices;
  }

  /**
   * Finds the zero-based index of a decorator by name in `_decorators`, or -1 if not found.
   *
   * @param name - The decorator name to find.
   */
  private findDecorator(name: string): number {
    return this._decoratorIndices[name] ?? -1;
  }

  /**
   * Rebuilds the internal name-to-index map of decorators by enumerating all current `_decorators`.
   */
  private updateDecoratorIndices(): void {
    this._decoratorIndices = {};
    this._decorators.forEach((fieldDecorator, idx) => {
      this._decoratorIndices[fieldDecorator.decorator.name] = idx;
    });
  }

  /**
   * Enumerates the names of all decorators on this field.
   */
  public get decoratorNames(): Iterable<string> {
    return function* (this: Field) {
      for (const fd of this._decorators) {
        yield fd.decorator.name;
      }
    }.call(this);
  }

  /**
   * Enumerates all decorator objects on this field.
   */
  public get decorators(): Iterable<Decorator> {
    return function* (this: Field) {
      for (const fd of this._decorators) {
        yield fd.decorator;
      }
    }.call(this);
  }

  /**
   * Overridden from ObservableObserver to handle decorator rename events
   * before passing the notification up to the field's parent (e.g., a table).
   *
   * @param event - The pending change event, containing sender info and methodName.
   */
  override notifyBefore(event: Event): void {
    if (this.observer) {
      this.observer.notifyBefore(event);
    }

    const sender = event.sender;
    const args = event.kwargs['args'];

    if (
      sender instanceof Decorator &&
      event.methodName === 'name' &&
      args.length > 0
    ) {
      this.onDecoratorRename(sender.name, args[0]);
    }
  }

  /**
   * Called when a decorator renames itself, updating `_decoratorIndices` so the new name is recognized.
   *
   * @param oldName - The old decorator name.
   * @param newName - The new decorator name.
   */
  private onDecoratorRename(oldName: string, newName: string): void {
    const index = this.findDecorator(oldName);
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
   * Generates the DSL string for this field.
   * @returns A DSL-formatted string representing this field.
   */
  public toDSL(): string {
    return (
      this._before +
      this._docString.toDSL() +
      this._decorators.map((d) => d.toDSL()).join('') +
      this._modifiers.map((m) => m.toDSL()).join('') +
      this._name
    );
  }

  /**
   * Deserializes a `Field` from a Reader, populating
   * any doc lines, decorators, modifiers, and formula.
   *
   * @param reader - A Reader positioned at a field definition in the DSL.
   * @returns A reconstructed `Field` instance.
   */
  public static deserialize(reader: Reader): Field {
    const result = new Field('');
    result._before = reader.next((d) => d.span.from);

    // doc_string
    const docsData = reader.entity?.docs ?? [];

    if (docsData.length > 0) {
      const docs: FieldDocLine[] = [];
      for (const docEntity of docsData) {
        const docReader = reader.withEntity(docEntity);
        const docLine = FieldDocLine.deserialize(docReader);
        docs.push(docLine);
        reader.position = docReader.position;
      }
      result._docString = new DocString(docs, (text) => new FieldDocLine(text));
    }

    // decorators
    const decoratorEntities = reader.entity?.decorators ?? [];

    for (const decEntity of decoratorEntities) {
      const decReader = reader.withEntity(decEntity);
      const fieldDecorator = FieldDecorator.deserialize(decReader);
      result._decorators.push(fieldDecorator);
      fieldDecorator.decorator.attach(result);
      reader.position = decReader.position;
    }

    // key/dim
    const keyData = reader.entity?.key;
    const dimData = reader.entity?.dim;
    const modifiersArray: any[] = [];

    if (keyData) modifiersArray.push(keyData);
    if (dimData) modifiersArray.push(dimData);

    modifiersArray.sort((a, b) => a.span.from - b.span.from);

    for (const modEntity of modifiersArray) {
      const modReader = reader.withEntity(modEntity);
      const fieldModifier = FieldModifier.deserialize(modReader);
      result._modifiers.push(fieldModifier);
      reader.position = modReader.position;
    }

    result._name = reader.next((d) => d.name.span.to);

    result._decoratorIndices = {};
    result._decorators.forEach((fd, i) => {
      result._decoratorIndices[fd.decorator.name] = i;
    });

    return result;
  }
}
