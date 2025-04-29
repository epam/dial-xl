import { lineBreak } from '../parser';
import { Table } from './Table';
import {
  endsWithBlankLine,
  Event,
  notifyObserver,
  ObservableObserver,
  Reader,
} from './utils';

/**
 * Represents a Sheet in the DSL, containing a collection of Table objects
 * and supporting raw text entries that appear outside of table definitions.
 *
 * The Sheet is observable, allowing it  to receive and propagate
 * event notifications when its tables or properties change.
 */
export class Sheet extends ObservableObserver {
  /**
   * The human-readable (or DSL) name of this sheet.
   */
  private _name: string;

  /**
   * Holds either raw text (strings) or Table objects that appear in this sheet.
   * When serializing to DSL, each entry is concatenated in order.
   */
  private readonly _tables: Array<Table | string>;

  /**
   * Any trailing text after all tables are parsed (e.g., leftover DSL).
   */
  private _after = '';

  /**
   * Maps table names to their index in `_tables`, for quick lookup.
   */
  private _tableIndices: Record<string, number>;

  /**
   * Constructs a new `Sheet` with the given name.
   *
   * @param name - The initial name of the sheet.
   */
  constructor(name: string) {
    super();
    this._name = name;
    this._tables = [];
    this._tableIndices = {};
  }

  /**
   * Gets the name of this sheet.
   */
  public get name(): string {
    return this._name;
  }

  /**
   * Sets the name of this sheet, triggering observer notifications.
   *
   * @param value - The new name for the sheet.
   */
  @notifyObserver()
  public set name(value: string) {
    this._name = value;
  }

  /**
   * Retrieves a {@link Table} by its name.
   *
   * @param name - The name of the table to retrieve.
   * @throws {Error} If no table with the given name is found.
   * @returns The matching `Table` instance.
   */
  public getTable(name: string): Table {
    const index = this.findTableIndex(name);
    if (index === -1) {
      throw new Error(`Table '${name}' not found`);
    }

    return this._tables[index] as Table;
  }

  /**
   * Adds a new table to the sheet, attaching it to this sheet for observer notifications.
   *
   * @param table - The table to add.
   */
  @notifyObserver()
  public addTable(table: Table): void {
    table.attach(this);
    this._tableIndices[table.name] = this._tables.length;
    this._tables.push(table);
  }

  /**
   * Removes a table by name from the sheet, detaching it from observer notifications.
   *
   * @param name - The name of the table to remove.
   * @throws {Error} If no table with the given name is found.
   * @returns The removed `Table` instance.
   */
  @notifyObserver()
  public removeTable(name: string): Table {
    const index = this.findTableIndex(name);

    if (index === -1) {
      throw new Error(`Table '${name}' not found`);
    }

    const table = this._tables.splice(index, 1)[0] as Table;
    table.detach();
    this.updateTableIndices();

    return table;
  }

  public get tables(): Table[] {
    return this._tables.filter(
      (entry): entry is Table => entry instanceof Table
    );
  }

  @notifyObserver()
  public moveTableToIndex(name: string, index: number): void {
    const tableIndex = this.findTableIndex(name);
    if (tableIndex === -1) {
      throw new Error(`Table '${name}' not found`);
    }

    const table = this._tables.splice(tableIndex, 1)[0];
    this._tables.splice(index, 0, table);
    this.updateTableIndices();
  }

  /**
   * Finds the index of a named table in `_tables`.
   *
   * @param name - The table name to look up.
   * @returns The table's index, or -1 if not found.
   */
  public findTableIndex(name: string): number {
    const result = this._tableIndices[name];

    return result === undefined ? -1 : result;
  }

  /**
   * Converts this sheet (tables, raw text, and trailing content)
   * back into a DSL string.
   * If table has emptyLineBefore set to true, it will add a blank line before the table,
   * unless it's the first table or the previous entry is a blank line.
   *
   * @returns The full DSL representation of this sheet.
   */
  public toDSL(): string {
    let content = '';

    this._tables.forEach((entry, index) => {
      if (typeof entry === 'string') {
        content += entry;

        return;
      }

      const table = entry as Table;

      if (table.emptyLineBefore) {
        const isFirst = index === 0;

        if (!isFirst && !endsWithBlankLine(content)) {
          content += lineBreak;
        }
      }

      content += table.toDSL();
    });

    return content + this._after;
  }

  /**
   * Deserializes a `Sheet` from a Reader containing parsed DSL data.
   *
   * @param reader - A `Reader` that provides spans and DSL text.
   * @param name - The name to assign to this sheet.
   * @returns A reconstructed `Sheet` instance, including any tables.
   */
  public static deserialize(reader: Reader, name: string): Sheet {
    const sheet = new Sheet(name);

    const tablesData = reader.entity?.tables ?? [];

    for (const tableEntity of tablesData) {
      // Move up to the 'from' position, ignoring trailing whitespace
      const tableReader = reader.withEntity(tableEntity);

      const unparsed = tableReader.nextUnparsed((d) => d.span.from);
      if (unparsed) {
        // Add raw text chunk + linebreak
        sheet._tables.push(unparsed + tableReader.tillLinebreak());
      }

      // Deserialize the actual Table object
      const table = Table.deserialize(tableReader);
      sheet._tables.push(table);
      table.attach(sheet);

      // Advance the main reader's position
      reader.position = tableReader.position;
    }

    // Read whatever is left (stored in `__after`)
    sheet._after = reader.beforeNext();
    sheet.updateTableIndices();

    return sheet;
  }

  /**
   * Called before any child/table modifications or property changes in this sheet.
   * Propagates the event up to the parent observer, then handles table rename logic.
   *
   * @param event - The event describing the pending change.
   */
  override notifyBefore(event: Event): void {
    // Bubble up to our parent (if any)
    super.notifyBefore(event);

    const sender = event.sender;
    const args = event.kwargs['args'];

    if (
      sender instanceof Table &&
      event.methodName === 'name' &&
      args.length > 0
    ) {
      this.onTableRename(sender.name, args[0]);
    }
  }

  /**
   * Handles table rename events, updating `_tableIndices` to reflect the new name.
   *
   * @param oldName - The old table name.
   * @param newName - The new table name.
   */
  private onTableRename(oldName: string, newName: string): void {
    const index = this.findTableIndex(oldName);
    if (index === -1) {
      throw new Error(`Table '${oldName}' not found`);
    }
    if (this._tableIndices[newName] !== undefined) {
      throw new Error(`Table '${newName}' already exists`);
    }
    this._tableIndices[newName] = this._tableIndices[oldName];
    delete this._tableIndices[oldName];
  }

  /**
   * Rebuilds the table index map from the current `_tables` array.
   * Ignores any raw string entries.
   */
  private updateTableIndices(): void {
    this._tableIndices = {};
    this._tables.forEach((entry, idx) => {
      if (entry instanceof Table) {
        this._tableIndices[entry.name] = idx;
      }
    });
  }
}
