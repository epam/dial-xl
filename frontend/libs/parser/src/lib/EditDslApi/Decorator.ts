import { lineBreak } from '../parser';
import { notifyObserver, ObservableNode, Reader } from './utils';

/**
 * Represents a single DSL decorator, prefixed by `!` and optionally followed by arguments in parentheses.
 * For example, `!size(2)` in the DSL would be captured by a `Decorator` instance with `name = "size"` and `arguments = "(2)"`.
 */
export class Decorator extends ObservableNode {
  /**
   * The prefix for this decorator.
   */
  private _prefix = '!';

  /**
   * The decorator's name (e.g. "size", "layout", etc.).
   */
  private _name: string;

  /**
   * An optional separator between name and arguments.
   */
  private _separator = '';

  /**
   * The raw string of arguments, e.g. `"(2)"` or `"(arg1, arg2)"`.
   */
  private _arguments = '';

  /**
   * Any trailing text after the decorator.
   */
  private _after = lineBreak;

  /**
   * Creates a new `Decorator` with the given name and optional arguments string.
   *
   * @param name - The name of the decorator.
   * @param args - Optional raw arguments string.
   */
  constructor(name: string, args?: string) {
    super();
    this._name = name;
    this._arguments = args || '';
  }

  /**
   * Gets the decorator's name.
   */
  public get name(): string {
    return this._name;
  }

  /**
   * Sets the decorator's name, triggering observer notifications.
   */
  @notifyObserver()
  public set name(value: string) {
    this._name = value;
  }

  /**
   * Gets the raw arguments string.
   */
  public get arguments(): string {
    return this._arguments;
  }

  /**
   * Sets the raw arguments string, triggering observer notifications.
   */
  @notifyObserver()
  public set arguments(value: string) {
    this._arguments = value;
  }

  /**
   * Converts this decorator to DSL format, e.g. `!size(2)\n`.
   *
   * @returns A string representing the decorator in DSL.
   */
  public toDSL(): string {
    return `${this._prefix}${this._name}${this._arguments}${this._after}`;
  }

  /**
   * Reconstructs a `Decorator` from a parsed DSL structure using a Reader.
   *
   * @param reader - The reader positioned at the decorator in the DSL text.
   * @returns A fully populated `Decorator` instance.
   */
  public static deserialize(reader: Reader): Decorator {
    // Start with an empty decorator
    const result = new Decorator('', '');

    // Read the prefix up to the name
    result._prefix = reader.next((d) => d.name.span.from);
    // Read the decorator name
    result._name = reader.next((d) => d.name.span.to);

    // TODO: parse arguments more precisely if needed. For now, read until span.to
    result._arguments = reader.next((d) => d.span.to);

    // Read leftover text (often a newline), stopping at next non-whitespace if needed
    result._after = reader.tillLinebreak(true);

    return result;
  }
}

/**
 * Wraps a Decorator specifically for fields.
 */
export class FieldDecorator {
  /**
   * The underlying `Decorator` instance.
   */
  private _decorator: Decorator;

  /**
   * Extra spacing appended after the decorator's DSL.
   */
  private _after = '  ';

  /**
   * Creates a new `FieldDecorator` by wrapping the given `Decorator`.
   *
   * @param decorator - The decorator to wrap.
   */
  constructor(decorator: Decorator) {
    this._decorator = decorator;
  }

  /**
   * Gets the wrapped `Decorator` object.
   */
  public get decorator(): Decorator {
    return this._decorator;
  }

  /**
   * Converts this field decorator to DSL format by combining the wrapped decorator's DSL
   * with extra spacing or text (`_after`).
   *
   * @returns A string representing the decorated field in DSL.
   */
  public toDSL(): string {
    return `${this._decorator.toDSL()}${this._after}`;
  }

  /**
   * Reconstructs a `FieldDecorator` from DSL using a Reader, including the
   * underlying `Decorator`.
   *
   * @param reader - A reader positioned at the decorator in the DSL text.
   * @returns A `FieldDecorator` with the parsed decorator attached.
   */
  public static deserialize(reader: Reader): FieldDecorator {
    // Create a placeholder decorator, then replace it after deserialization
    const result = new FieldDecorator(new Decorator('', ''));
    const dec = Decorator.deserialize(reader);

    result._decorator = dec;
    // Read leftover text (e.g. spacing) before next token
    result._after = reader.beforeNext();

    return result;
  }
}
