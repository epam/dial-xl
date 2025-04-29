import { defaultRowKey, lineBreak } from '../../parser';
import { escapeFieldName, unescapeFieldName } from '../../services';
import { Event, notifyObserver, ObservableObserver, Reader } from '../utils';
import { _Override, Override } from './Override';
import { OverrideHeader } from './OverrideHeader';
import { OverrideLine } from './OverrideLine';

/**
 * Represents the full `override` block in the DSL, consisting of:
 * - A prefix line (`override\n`),
 * - One or more header lines (e.g., `row,[a],[b]`),
 * - One or more lines containing override values.
 *
 * Example:
 * ```dsl
 * override
 * row,[a],[b]
 * 1,2,3
 * 4,5,6
 * ```
 */
export class _Overrides {
  /** Any text found before the `override\n` prefix.*/
  private _before = '';

  /** Defining the start of the override block. */
  private _prefix = 'override' + lineBreak;

  /** An array of parsed override headers. */
  private _headers: OverrideHeader[] = [];

  /** An array of override lines, each containing multiple values. */
  private _lines: OverrideLine[] = [];

  /** Gets all header definitions for this override block. */
  public get headers(): OverrideHeader[] {
    return this._headers;
  }

  /** Gets all override lines (rows of values) for this override block. */
  public get lines(): OverrideLine[] {
    return this._lines;
  }

  /**
   * Converts this entire override block to DSL format by concatenating:
   * `_before`, `_prefix`, all header lines, and all value lines.
   *
   * @returns A DSL string representing this override block.
   */
  public toDSL(): string {
    return (
      this._before +
      this._prefix +
      this._headers.map((h) => h.toDSL()).join('') +
      this._lines.map((l) => l.toDSL()).join('')
    );
  }

  /**
   * Deserializes an `_Overrides` object from the given Reader,
   * reading text before `override\n`, then parsing header entities and line entities.
   *
   * @param reader - A `Reader` positioned at an override block in the DSL.
   * @returns A reconstructed `_Overrides` instance with headers and lines parsed.
   */
  public static deserialize(reader: Reader): _Overrides {
    const result = new _Overrides();

    // Read any text before `override\n`
    result._before = reader.next((d) => d.span.from);
    // Read the prefix (usually `override\n`) up to the next break
    result._prefix = reader.beforeNext();

    // Parse header definitions
    const headerEntities = reader.entity?.headers ?? [];
    for (const headerEntity of headerEntities) {
      const headerReader = reader.withEntity(headerEntity);
      const header = OverrideHeader.deserialize(headerReader);
      result._headers.push(header);
      reader.position = headerReader.position;
    }

    // Parse line definitions (rows of override values)
    const lineEntities = reader.entity?.values ?? [];
    for (const lineEntity of lineEntities) {
      const lineReader = reader.withEntity(lineEntity);
      const lineObj = OverrideLine.deserialize(lineReader);
      result._lines.push(lineObj);
      reader.position = lineReader.position;
    }

    return result;
  }
}

/**
 * Manages a higher-level "overrides" structure that mirrors an internal
 * _Overrides object but also maintains a corresponding array of
 * Override instances in a 1-to-1 relationship with each OverrideLine.
 *
 * Each Override object tracks key/value pairs for row overrides, plus
 * an optional `rowNumber`. This class ensures changes to an `Override` propagate
 * to the underlying _Overrides DSL structure and vice versa.
 */
export class Overrides extends ObservableObserver {
  /** The low-level `_Overrides` object storing header definitions and override lines. */
  private _overrides: _Overrides;

  /**
   * If the field named `"row"` is present, `_rowPosition` tracks its index in `_fieldNames`.
   * Otherwise, `_rowPosition = null`.
   */
  private _rowPosition: number | null = null;

  /** A list of field names in column order. Includes `"row"` if present. */
  private _fieldNames: string[];

  /**
   * An array of higher-level Override objects, each corresponding to one OverrideLine in `_overrides`.
   */
  private _lines: Override[];

  /** Creates a new `Overrides` instance. */
  constructor() {
    super();
    this._overrides = new _Overrides();
    this._fieldNames = [];
    this._lines = [];
  }

  /**
   * Lists all field names except `"row"`, unescaped.
   *
   * @returns An array of unescaped field names (excluding `"row"`).
   */
  public get fieldNames(): string[] {
    return this._fieldNames
      .filter((name) => name !== defaultRowKey)
      .map((name) => unescapeFieldName(name, true));
  }

  /**
   * Indicates the zero-based index of the `"row"` field in `_fieldNames`, or `null` if none.
   */
  public get rowPosition(): number | null {
    return this._rowPosition;
  }

  /**
   * The total number of override lines (i.e., rows of overrides).
   */
  public get length(): number {
    return this._lines.length;
  }

  /**
   * Retrieves the override at a given row index.
   *
   * @param index - The index of the override line to retrieve.
   * @throws {Error} If the index is out of range.
   * @returns The matching Override object.
   */
  public getItem(index: number): Override {
    if (index < 0 || index >= this._lines.length) {
      throw new Error('Override line index out of range');
    }

    return this._lines[index];
  }

  /**
   * Replaces the override at a given row index with a new one, detaching the old one
   * and attaching the new. Reflects the change in `_overrides`.
   *
   * @param index - The index of the override line to replace.
   * @param value - The new Override object to use.
   * @throws {Error} If the index is out of range.
   */
  @notifyObserver()
  public setItem(index: number, value: Override): void {
    if (index < 0 || index >= this._lines.length) {
      throw new Error('Override line index out of range');
    }

    const oldOverride = this._lines[index];
    oldOverride.detach();
    // Attach the new override
    // Update low-level `_overrides`
    this._overrides.lines[index] = this.attachOverrideLine(value);
    // Update our local array
    this._lines[index] = value;
  }

  /**
   * Deletes an override row at the given index, detaching it from observer notifications
   * and removing its line from `_overrides`.
   *
   * @param index - The index of the override line to delete.
   * @throws {Error} If the index is out of range.
   */
  @notifyObserver()
  public deleteItem(index: number): void {
    if (index < 0 || index >= this._lines.length) {
      throw new Error('Override line index out of range');
    }
    this._overrides.lines.splice(index, 1);
    const removedOverride = this._lines.splice(index, 1)[0];
    removedOverride.detach();
  }

  /**
   * Appends a new override row at the end of the list, attaching it and creating
   * a corresponding line in `_overrides`.
   *
   * @param value - The Override object to add.
   */
  @notifyObserver()
  public append(value: Override): void {
    const overrideLine = this.attachOverrideLine(value);
    this._overrides.lines.push(overrideLine);
    this._lines.push(value);
  }

  /**
   * Renames a field in the override block, updating all references to the field
   * @param oldName - The old field name
   * @param newName - The new field name
   */
  @notifyObserver()
  public renameField(oldName: string, newName: string): void {
    const escapedOldName = escapeFieldName(oldName, false, true);
    const escapedNewName = escapeFieldName(newName, false, true);

    const index = this._fieldNames.indexOf(escapedOldName);
    if (index === -1) {
      throw new Error(`Field '${escapedOldName}' not found in overrides.`);
    }

    if (this._fieldNames.includes(escapedNewName)) {
      throw new Error(`Field '${escapedNewName}' already exists in overrides.`);
    }

    this._fieldNames[index] = escapedNewName;
    this._overrides.headers[index].name = escapedNewName;
  }

  /**
   * Internal helper that attaches an Override object to this observer,
   * ensuring all field names exist, and creates a corresponding OverrideLine
   * in `_overrides` with the appropriate `_Override` cells.
   *
   * @param value - The new override row object.
   * @returns An `OverrideLine` with matching columns for each field name.
   */
  private attachOverrideLine(value: Override): OverrideLine {
    // If rowNumber is set, ensure "row" field is present
    if (value.rowNumber !== null) {
      this.addEmptyIfMissing(defaultRowKey);
    }

    // Ensure all fields in this override exist in `_fieldNames`
    for (const name of value.names) {
      this.addEmptyIfMissing(escapeFieldName(name, true, true));
    }

    // Build the actual `_Override` array for this row
    const values: _Override[] = [];
    for (let index = 0; index < this._fieldNames.length; index++) {
      const name = this._fieldNames[index];

      // If not the first column, insert a comma after the previous cell
      if (index > 0) {
        values[index - 1].after = ',';
      }

      // If the override object has a value for this field
      if (unescapeFieldName(name, true) in (value as any)._values) {
        const rawVal = value.getItem(unescapeFieldName(name, true));
        values.push(new _Override(rawVal));
      } else if (name === defaultRowKey) {
        // The "row" field uses `rowNumber`
        values.push(new _Override(value.rowNumber ?? ''));
      } else {
        // Default to empty string for missing fields
        values.push(new _Override(''));
      }
    }

    // Attach the override to observe its changes
    value.attach(this);

    return new OverrideLine(values);
  }

  /**
   * Ensures the given field name is present in `_fieldNames`. If it's missing,
   * this method inserts it into `_fieldNames`, appends a new header to `_overrides.headers`,
   * and adds an empty `_Override` cell to each existing row.
   *
   * @param name - The escaped field name to ensure.
   */
  private addEmptyIfMissing(name: string): void {
    if (!this._fieldNames.includes(name)) {
      // If it's the "row" field, store its position
      if (name === defaultRowKey) {
        this._rowPosition = this._fieldNames.length;
      }

      // Add it to the list
      this._fieldNames.push(name);

      // If we already have headers, make the last header's `after` a comma
      if (this._overrides.headers.length > 0) {
        this._overrides.headers[this._overrides.headers.length - 1].after = ',';
      }

      // Create a new header
      const newHeader = new OverrideHeader(name);
      this._overrides.headers.push(newHeader);

      // For each line, append a new cell
      for (const line of this._overrides.lines) {
        if (line.overrides.length > 0) {
          line.overrides[line.overrides.length - 1].after = ',';
        }
        line.overrides.push(new _Override(''));
      }
    }
  }

  /**
   * Generates a DSL string for the entire override block by delegating to `_overrides`.
   *
   * @returns A DSL representation of all override headers and lines.
   */
  public toDSL(): string {
    return this._overrides.toDSL();
  }

  /**
   * Called before property or method changes on child Override objects. It
   * synchronizes changes (e.g. adding/deleting a field value) to `_overrides`.
   *
   * @param event - An event describing the pending change.
   */
  override notifyBefore(event: Event): void {
    // Bubble event up to parent if present
    if (this.observer) {
      this.observer.notifyBefore(event);
    }

    const sender = event.sender;
    if (sender instanceof Override) {
      const overrideIndex = this._lines.indexOf(sender);
      if (overrideIndex === -1) return;

      if (event.methodName === 'setItem') {
        const [rawKey, rawValue] = event.kwargs['args'];
        const escapedName = escapeFieldName(rawKey, true, true);
        this.onOverrideUpdate(overrideIndex, escapedName, rawValue);
      } else if (event.methodName === 'deleteItem') {
        const [rawKey] = event.kwargs['args'];
        const escapedName = escapeFieldName(rawKey, true, true);
        this.onOverrideRemove(overrideIndex, escapedName);
      } else if (event.methodName === 'rowNumber') {
        const [newRowNumber] = event.kwargs['args'];
        if (newRowNumber == null) {
          this.onOverrideRemove(overrideIndex, defaultRowKey);
        } else {
          this.onOverrideUpdate(overrideIndex, defaultRowKey, newRowNumber);
        }
      }
    }
  }

  /**
   * Rebuilds this object from a newly parsed `_Overrides`, converting each OverrideLine
   * into an Override object and storing them in `_lines`.
   *
   * @param overrides - The newly parsed `_Overrides` instance to adopt.
   */
  private setOverrides(overrides: _Overrides): void {
    // Grab field names from headers
    this._fieldNames = overrides.headers.map((header) => header.name);
    // Check for a "row" field
    this._rowPosition = this._fieldNames.indexOf(defaultRowKey);
    if (this._rowPosition === -1) {
      this._rowPosition = null;
    }

    // Build an array of Override objects from each line
    const newLines: Override[] = [];
    for (const line of overrides.lines) {
      const overrideValues: Record<string, string> = {};

      line.overrides.forEach((cell, idx) => {
        const fieldName = this._fieldNames[idx];
        const cellVal = cell.override;

        // If there's a row position, skip the cell if it's the row
        if (this._rowPosition !== null && idx === this._rowPosition) {
          return;
        }
        overrideValues[unescapeFieldName(fieldName, true)] = cellVal;
      });

      let rowNum: string | null = null;
      if (this._rowPosition !== null) {
        rowNum = line.overrides[this._rowPosition].override;
      }

      const overrideObj = new Override(overrideValues, rowNum);
      overrideObj.attach(this);
      newLines.push(overrideObj);
    }

    // Detach old overrides
    this._lines.forEach((ov) => ov.detach());
    // Replace with new lines
    this._lines = newLines;
    this._overrides = overrides;
  }

  /**
   * Updates an individual cell in `_overrides` when the corresponding
   * override row calls `setItem`.
   *
   * @param index - The row index of the override.
   * @param name - The escaped field name.
   * @param value - The new override value.
   */
  private onOverrideUpdate(index: number, name: string, value: string): void {
    // Ensure this field name exists in `_fieldNames` & `_overrides.headers`.
    this.addEmptyIfMissing(name);
    const position = this._fieldNames.indexOf(name);
    // Update the cell
    this._overrides.lines[index].overrides[position].override = value;
  }

  /**
   * Clears or removes an individual cell in `_overrides` when the corresponding
   * override row calls `deleteItem` or row number is cleared.
   *
   * @param index - The row index of the override.
   * @param name - The escaped field name to remove.
   */
  private onOverrideRemove(index: number, name: string): void {
    const position = this._fieldNames.indexOf(name);
    if (position === -1) {
      return;
    }
    // Clear the cell
    this._overrides.lines[index].overrides[position].override = '';

    // Check if this column is now empty in all rows
    let last = true;
    for (const line of this._overrides.lines) {
      if (line.overrides[position].override !== '') {
        last = false;
        break;
      }
    }

    // If all rows are empty in this column, remove the column
    if (last) {
      const removedHeader = this._overrides.headers.splice(position, 1)[0];
      if (position > 0 && this._overrides.headers.length > 0) {
        // carry over "after" from the removed header
        this._overrides.headers[position - 1].after = removedHeader.after;
      }
      for (const line of this._overrides.lines) {
        const removedValue = line.overrides.splice(position, 1)[0];
        if (position > 0 && line.overrides.length > 0) {
          line.overrides[position - 1].after = removedValue.after;
        }
      }
      this._fieldNames.splice(position, 1);

      // If we just removed "row", reset _rowPosition
      if (name === defaultRowKey) {
        this._rowPosition = null;
      }
    }

    const isRowEmpty = this._overrides.lines[index].overrides.every(
      (override) => override.override === ''
    );

    if (isRowEmpty) {
      this._overrides.lines.splice(index, 1);
      this._lines.splice(index, 1);
    }
  }

  /**
   * Reconstructs an `Overrides` object from a Reader, parsing
   * the underlying `_Overrides` and then calling `setOverrides` to build
   * higher-level Override rows.
   *
   * @param reader - A `Reader` positioned at an override block in the DSL.
   * @returns A new `Overrides` object with parsed rows.
   */
  public static deserialize(reader: Reader): Overrides {
    const result = new Overrides();
    const parsed = _Overrides.deserialize(reader);
    result.setOverrides(parsed);

    return result;
  }
}
