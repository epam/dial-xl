import { lineBreak } from '../parser';
import { Reader } from './utils';

/**
 * Represents a single documentation line, prefixed with `"##"`.
 * Used for storing notes in the DSL.
 */
export class DocLine {
  /**
   * The prefix used before the main text of a doc line.
   */
  private _prefix = '##';

  /**
   * The main text content of this doc line.
   */
  private _text: string;

  /**
   * Suffix appended at the end of this line - line break.
   */
  private _after = lineBreak;

  /**
   * Constructs a new DocLine instance.
   *
   * @param text - The initial text content for this documentation line.
   */
  constructor(text: string) {
    this._text = text;
  }

  /**
   * Gets the main text content of this doc line.
   */
  public get text(): string {
    return this._text;
  }

  /**
   * Sets the text content of this doc line.
   */
  public set text(value: string) {
    this._text = value;
  }

  /**
   * Converts this doc line back into DSL format, e.g. "##Some text\n".
   * The `_prefix` and `_after` are applied around `_text`.
   *
   * @returns A DSL string representation of this doc line.
   */
  public toDSL(): string {
    return `${this._prefix}${this._text}${this._after}`;
  }

  /**
   * Deserializes a DocLine from a given Reader, extracting the prefix
   * and text content based on spans.
   *
   * @param reader - A Reader that provides DSL text and positional data.
   * @returns A new DocLine instance populated from the reader's current position.
   */
  public static deserialize(reader: Reader): DocLine {
    const result = new DocLine('');

    // "##" prefix is read up to `span.from + 2`
    result._prefix = reader.next((d) => d.span.from + 2);

    // Read the entire line up to d.span.to
    const line = reader.next((d) => d.span.to);
    const text = line.trimEnd();

    result._text = text;
    // The leftover "after" is what's beyond the trimmed text
    result._after = line.slice(text.length);

    return result;
  }
}

/**
 * A specialized documentation line used in fields
 */
export class FieldDocLine {
  /**
   * Underlying DocLine storing the main documentation text.
   */
  private _docLine: DocLine;

  /**
   * Suffix appended at the very end after the doc line.
   */
  private _after = '  ';

  /**
   * Creates a new FieldDocLine.
   *
   * @param text - The initial text for the underlying doc line.
   */
  constructor(text: string) {
    this._docLine = new DocLine(text);
  }

  /**
   * Gets the main text content of this field doc line.
   */
  public get text(): string {
    return this._docLine.text;
  }

  /**
   * Sets the main text content of this field doc line.
   */
  public set text(value: string) {
    this._docLine.text = value;
  }

  /**
   * Produces the DSL string, e.g. "##Some field doc\n  ".
   * Combines the underlying doc line and the extra trailing spacing.
   *
   * @returns A DSL string representation of this field doc line.
   */
  public toDSL(): string {
    return `${this._docLine.toDSL()}${this._after}`;
  }

  /**
   * Deserializes a FieldDocLine by first reading a  DocLine,
   * then capturing any leftover spacing (e.g., the "  " suffix).
   *
   * @param reader - A Reader providing DSL text and positional data.
   * @returns A new FieldDocLine instance reconstructed from the reader.
   */
  public static deserialize(reader: Reader): FieldDocLine {
    const result = new FieldDocLine('');

    result._docLine = DocLine.deserialize(reader);
    result._after = reader.beforeNext();

    return result;
  }
}

/**
 * A function type that creates either a DocLine or a FieldDocLine
from a given string of text.
 */
export type DocLineFactory = (text: string) => DocLine | FieldDocLine;

/**
 * Represents a collection of one or more doc lines (either DocLine or
 * FieldDocLine), with a factory function that can construct these lines
 * from arbitrary text.
 *
 * This is useful for storing multi-line documentation or comments in the DSL,
 * and then converting them back into strings for serialization.
 */
export class DocString {
  /**
   * The array of doc lines making up this doc string.
   */
  private _lines: Array<DocLine | FieldDocLine>;

  /**
   * A factory function used to create doc lines from raw strings.
   */
  private readonly _factory: DocLineFactory;

  /**
   * Constructs a new DocString instance.
   *
   * @param lines - An initial array of doc lines (DocLine or FieldDocLine).
   * @param factory - A function that can create new doc lines given a string.
   */
  constructor(lines: Array<DocLine | FieldDocLine>, factory: DocLineFactory) {
    this._lines = lines;
    this._factory = factory;
  }

  /**
   * Gets the textual content of this doc string, combining all lines with newlines.
   * If there are no lines, returns `null`.
   */
  public get text(): string | null {
    if (this._lines.length === 0) {
      return null;
    }

    return this._lines.map((line) => line.text).join(lineBreak);
  }

  /**
   * Sets the doc string content by splitting the incoming text on newlines
   * and creating new doc lines for each segment.
   * If set to `null`, all lines are removed.
   *
   * @param value - A multi-line string or `null` to clear.
   */
  public set text(value: string | null) {
    if (value == null) {
      this._lines = [];
    } else {
      this._lines = value.split(lineBreak).map((line) => this._factory(line));
    }
  }

  /**
   * Converts all doc lines to DSL format and concatenates them into a single string.
   *
   * @returns A DSL representation of this entire doc string.
   */
  public toDSL(): string {
    return this._lines.map((line) => line.toDSL()).join('');
  }
}
