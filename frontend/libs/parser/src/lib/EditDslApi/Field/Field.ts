import { dimKeyword, keyKeyword, lineBreak } from '../../parser';
import { escapeFieldName, unescapeFieldName } from '../../services';
import { Decorator, FieldDecorator } from '../Decorator';
import { DocString, FieldDocLine } from '../DocString';
import { Event, notifyObserver, ObservableObserver, Reader } from '../utils';
import { FieldModifier } from './FieldModifier';

/**
 * Represents a single field definition within a table. It can include:
 * - Documentation lines (docString)
 * - Decorators (field-scoped)
 * - Modifiers (e.g., "key", "dim")
 * - A name and optional formula
 *
 * Example DSL snippet that this class can represent:
 * ```dsl
 *   ## field doc line
 *   !decorator(1)
 *   key [fieldName] = formula
 * ```
 */
export class Field extends ObservableObserver {
  /** Spacing or text that precedes this field in the DSL. */
  private _before = '  ';

  /** A doc string containing any documentation lines attached to this field. */
  private _docString: DocString;

  /** An array of field-specific decorators, each wrapped in a FieldDecorator. */
  private _decorators: FieldDecorator[] = [];

  /** A list of modifiers (key, dim, etc.) that appear before the field name. */
  private _modifiers: FieldModifier[] = [];

  /** The escaped field name, e.g. `"[fieldName]"`. */
  private _name: string;

  /** The separator between the field name and its formula,. */
  private _separator = ' = ';

  /** The optional formula for this field. */
  private _formula: string | null = null;

  /** Any trailing text after the field definition. */
  private _after = lineBreak;

  /**
   * A map of decorator names to their index in `_decorators`.
   * Updated whenever decorators are added or removed.
   */
  private _decoratorIndices: Record<string, number> = {};

  /**
   * Constructs a new Field instance with the given name and optional formula.
   *
   * @param name - The initial field name (unescaped).
   * @param formula - The initial formula, or null if none.
   */
  constructor(name: string, formula: string | null) {
    super();
    this._name = escapeFieldName(name, true, true);
    this._formula = formula;
    this._docString = new DocString([], (text) => new FieldDocLine(text));
  }

  /**
   * Indicates whether this field has a "key" modifier.
   */
  public get key(): boolean {
    return this._modifiers.some((m) => m.name === keyKeyword);
  }

  /**
   * Enables or disables the "key" modifier on this field, inserting or removing the modifier.
   */
  public set key(value: boolean) {
    if (value !== this.key) {
      if (value) {
        const modifier = new FieldModifier(keyKeyword);
        modifier.attach(this);
        this._modifiers.unshift(modifier);
      } else {
        this.removeModifier(keyKeyword);
      }
    }
  }

  /**
   * Indicates whether this field has a "dim" modifier.
   */
  public get dim(): boolean {
    return this._modifiers.some((m) => m.name === dimKeyword);
  }

  /**
   * Enables or disables the "dim" modifier on this field, inserting or removing the modifier.
   */
  public set dim(value: boolean) {
    if (value !== this.dim) {
      if (value) {
        const modifier = new FieldModifier(dimKeyword);
        modifier.attach(this);
        this._modifiers.push(modifier);
      } else {
        this.removeModifier(dimKeyword);
      }
    }
  }

  /**
   * Removes a modifier by name, detaching it from this field.
   *
   * @param name - The modifier name to remove, e.g. "key" or "dim".
   * @throws {Error} If the modifier does not exist on this field.
   */
  private removeModifier(name: string): void {
    const index = this._modifiers.findIndex((mod) => mod.name === name);
    if (index === -1) {
      throw new Error(`Modifier '${name}' not found`);
    }
    const mod = this._modifiers[index];
    mod.detach();
    this._modifiers.splice(index, 1);
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
   * Gets the current formula of this field, or null if none is set.
   */
  public get formula(): string | null {
    return this._formula;
  }

  /**
   * Sets or clears the formula, triggering observer notifications.
   *
   * @param value - A new formula string, or null to remove the formula.
   */
  @notifyObserver()
  public set formula(value: string | null) {
    this._formula = value;
  }

  /**
   * Retrieves the doc string text for this field, or null if there are no lines.
   */
  public get docString(): string {
    return <string>this._docString.text;
  }

  /**
   * Sets the doc string text. If set to null, clears all documentation lines.
   *
   * @param value - The new doc string content, or null to remove all lines.
   */
  public set docString(value: string | null) {
    this._docString.text = value;
  }

  /**
   * Checks if this field has a specific decorator by name.
   *
   * @param name - The name of the decorator to check for.
   * @returns True if the decorator exists, false otherwise.
   */
  public hasDecorator(name: string): boolean {
    return this.findDecoratorIndex(name) !== -1;
  }

  /**
   * Retrieves a decorator by name. Throws an error if no matching decorator is found.
   *
   * @param name - The name of the decorator to find.
   * @returns The underlying Decorator object.
   */
  public getDecorator(name: string): Decorator {
    const index = this.findDecoratorIndex(name);
    if (index === -1) {
      throw new Error(`Decorator '${name}' not found`);
    }

    return this._decorators[index].decorator;
  }

  /**
   * Adds a decorator to this field, wrapped in a FieldDecorator for field-specific spacing/logic.
   *
   * @param decorator - The Decorator to attach to this field.
   */
  @notifyObserver()
  public addDecorator(decorator: Decorator): void {
    if (decorator.name in this._decoratorIndices) {
      throw new Error(`Decorator '${decorator.name}' already exists`);
    }
    const fieldDecorator = new FieldDecorator(decorator);
    fieldDecorator.attach(this);
    this._decorators.push(fieldDecorator);
    this._decoratorIndices[decorator.name] = this._decorators.length - 1;
  }

  /**
   * Removes a decorator from this field by name.
   *
   * @param name - The name of the decorator to remove.
   * @returns The removed decorator object.
   */
  @notifyObserver()
  public removeDecorator(name: string): Decorator {
    const index = this.findDecoratorIndex(name);
    if (index === -1) {
      throw new Error(`Decorator '${name}' not found`);
    }
    const fieldDecorator = this._decorators[index];
    fieldDecorator.detach();
    this._decorators.splice(index, 1);

    this._decoratorIndices = {};
    this._decorators.forEach((fd, i) => {
      this._decoratorIndices[fd.decorator.name] = i;
    });

    return fieldDecorator.decorator;
  }

  /**
   * Finds the index of a decorator by name in `_decoratorIndices`.
   *
   * @param name - The decorator name to search for.
   */
  private findDecoratorIndex(name: string): number {
    return this._decoratorIndices[name] ?? -1;
  }

  /**
   * Enumerates all decorator objects attached to this field.
   */
  public get decorators(): Decorator[] {
    return this._decorators.map((fd) => fd.decorator);
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
   * Generates the DSL string for this field.
   * @returns A DSL-formatted string representing this field.
   */
  public toDSL(): string {
    const decoratorsDSL = this._decorators.map((fd) => fd.toDSL()).join('');
    const modifiersDSL = this._modifiers.map((m) => m.toDSL()).join('');
    const formulaPart =
      this._formula == null ? '' : `${this._separator}${this._formula}`;

    return (
      `${this._before}` +
      `${this._docString.toDSL()}` +
      `${decoratorsDSL}` +
      `${modifiersDSL}` +
      `${this._name}` +
      `${formulaPart}` +
      `${this._after}`
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
    // Start with empty name / formula
    const result = new Field('', null);

    // __before = text up to d["span"]["from"]
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
      fieldDecorator.attach(result);
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
      fieldModifier.attach(result);
      result._modifiers.push(fieldModifier);
      reader.position = modReader.position;
    }

    // read the prefix up to name, then name, then formula if present
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // result._prefix = reader.next((d) => d.name.span.from);
    result._name = reader.next((d) => d.name.span.to);

    const formulaData = reader.entity?.formula;
    if (formulaData) {
      result._separator = reader.next(formulaData.span.from);
      result._formula = reader.next(formulaData.span.to);
    }

    // read leftover text
    result._after = reader.tillLinebreak();

    // build decorator_indices map
    result._decoratorIndices = {};
    result._decorators.forEach((fd, idx) => {
      result._decoratorIndices[fd.decorator.name] = idx;
    });

    return result;
  }
}
