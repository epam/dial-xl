import { lineBreak } from '../../parser';
import { notifyObserver, ObservableObserver, Reader } from '../utils';
import { ApplyFilter } from './ApplyFilter';
import { ApplySort } from './ApplySort';

/**
 * Represents an "apply" section in the DSL, which may include
 * a ApplySort and/or a ApplyFilter.
 *
 * Example DSL snippet:
 * ```dsl
 * apply
 * sort [field]
 * filter [field] > 10
 * ```
 */
export class Apply extends ObservableObserver {
  /**
   * Text that appears before the `apply` keyword (often whitespace or comments).
   */
  private _before = '';

  /**
   * The prefix for this section, by default `"apply"` plus a line break.
   */
  private _prefix = 'apply' + lineBreak;

  /**
   * An array storing the operations in the order they appear.
   * Each operation can be an `ApplySort` or an `ApplyFilter`.
   */
  private _operations: Array<ApplySort | ApplyFilter> = [];

  /**
   * Any trailing text after all operations, typically leftover whitespace or a newline.
   */
  private _after = '';

  /**
   * The current array index where an ApplySort (if any) is stored, or `null` if none.
   */
  private _sortIndex: number | null = null;

  /**
   * The current array index where an ApplyFilter (if any) is stored, or `null` if none.
   */
  private _filterIndex: number | null = null;

  constructor() {
    super();
  }

  /**
   * Converts this apply section to DSL format, by concatenating:
   * `_before`, `_prefix`, each operation's DSL output, and `_after`.
   *
   * @returns A DSL string representing this apply section.
   */
  public toDSL(): string {
    return (
      `${this._before}` +
      `${this._prefix}` +
      this._operations.map((op) => op.toDSL()).join('') +
      `${this._after}`
    );
  }

  /**
   * Gets the `ApplySort` object if present, otherwise `null`.
   */
  public get sort(): ApplySort | null {
    return this._sortIndex !== null
      ? (this._operations[this._sortIndex] as ApplySort)
      : null;
  }

  /**
   * Sets or removes the `ApplySort` operation, triggering observer notifications.
   */
  @notifyObserver()
  public set sort(value: ApplySort | null) {
    this._sortIndex = this._setIndexedNode(value, this._sortIndex);
  }

  /**
   * Gets the `ApplyFilter` object if present, otherwise `null`.
   */
  public get filter(): ApplyFilter | null {
    return this._filterIndex !== null
      ? (this._operations[this._filterIndex] as ApplyFilter)
      : null;
  }

  /**
   * Sets or removes the `ApplyFilter` operation, triggering observer notifications.
   */
  @notifyObserver()
  public set filter(value: ApplyFilter | null) {
    this._filterIndex = this._setIndexedNode(value, this._filterIndex);
  }

  /**
   * Internal helper for attaching, detaching, and positioning an `ApplySort`
   * or `ApplyFilter` operation at a given index in `_operations`.
   *
   * @param node - The new operation (sort or filter), or null to remove.
   * @param currentIndex - The current index of that operation, or null if it doesn't exist yet.
   * @returns The final index of the operation, or null if removed.
   */
  private _setIndexedNode(
    node: ApplySort | ApplyFilter | null,
    currentIndex: number | null
  ): number | null {
    if (currentIndex !== null && node === null) {
      // remove the old operation
      this._operations.splice(currentIndex, 1);

      return null;
    } else if (node !== null && currentIndex === null) {
      // add the new operation
      this._operations.push(node);
      node.attach(this);

      return this._operations.length - 1;
    } else if (node !== null && currentIndex !== null) {
      // replace existing
      this._operations[currentIndex] = node;
      node.attach(this);

      return currentIndex;
    }

    return currentIndex;
  }

  /**
   * Deserializes an `Apply` object from the given Reader,
   * reading `_before`, then possibly a `sort` and/or `filter` operation
   * in the order they appear.
   *
   * @param reader - A `Reader` positioned at an `apply` section in the DSL.
   * @returns A new `Apply` instance containing sort/filter operations.
   */
  public static deserialize(reader: Reader): Apply {
    const result = new Apply();
    result._before = reader.next((d) => d.span.from);

    const sortEntity = reader.entity?.sort;
    const filterEntity = reader.entity?.filter;
    const operationEntities: any[] = [];

    if (sortEntity) operationEntities.push(sortEntity);
    if (filterEntity) operationEntities.push(filterEntity);

    // Sort them by 'span.from' to preserve DSL order
    operationEntities.sort((a, b) => a.span.from - b.span.from);

    // If we have operations, prefix ends where the first one starts
    if (operationEntities.length > 0) {
      result._prefix = reader.next(operationEntities[0].span.from);
    } else {
      // Otherwise read up to the final
      result._prefix = reader.tillLinebreak();
    }

    // Parse each operation in order
    for (const operationEntity of operationEntities) {
      if (operationEntity === sortEntity) {
        const sortReader = reader.withEntity(sortEntity);
        const sortObj = ApplySort.deserialize(sortReader);
        result._sortIndex = result._operations.length;
        result._operations.push(sortObj);
        sortObj.attach(result);
        reader.position = sortReader.position;
      } else if (operationEntity === filterEntity) {
        const filterReader = reader.withEntity(filterEntity);
        const filterObj = ApplyFilter.deserialize(filterReader);
        result._filterIndex = result._operations.length;
        result._operations.push(filterObj);
        filterObj.attach(result);
        reader.position = filterReader.position;
      }
    }

    result._after = reader.next((d) => d.span.to);

    return result;
  }
}
