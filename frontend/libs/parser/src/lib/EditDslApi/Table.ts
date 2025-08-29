import { lineBreak, tableKeyword } from '../parser';
import { escapeTableName, unescapeTableName } from '../services';
import { Apply } from './Apply';
import { Decorator } from './Decorator';
import { DocLine, DocString } from './DocString';
import { Field, FieldGroup, FieldGroups } from './Field';
import { DynamicField } from './Field/DynamicField';
import { Overrides } from './Override';
import { Total, Totals } from './Total';
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

  /** FieldGroup objects.*/
  private _fieldGroups: FieldGroups;

  /** An array of apply blocks or totals. */
  private _applyTotals: Array<Apply | Total> = [];

  /** The totals object. */
  private _totals: Totals;

  /** An optional override block associated with this table. */
  private _overrides: Overrides | null = null;

  /** A string that appears after all table content (fields, overrides). */
  private _after = '';

  /** A mapping of dynamic fields by name (e.g., pivot-generated fields). */
  private _dynamicFields: Record<string, DynamicField> = {};

  /** The index of the apply block, if any. */
  private _applyIndex: number | null = null;

  /**
   * A name-to-index map of decorators for quick lookup. Updated whenever decorators are added or removed.
   */
  private _decoratorIndices: Record<string, number> = {};

  /** A flag indicating whether to add an empty line before the table. */
  private _emptyLineBefore = false;

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
    this._docString = new DocString([], (txt) => new DocLine(txt));
    this._fieldGroups = new FieldGroups();
    this._fieldGroups.attach(this);
    this._totals = new Totals();
    this._totals.attach(this);
  }

  /**
   * Converts this table and all its contents (doc string, decorators, fields, overrides, etc.)
   * back into DSL text.
   *
   * @returns A DSL string representing this table.
   */
  public toDSL(): string {
    return (
      this._before +
      this._docString.toDSL() +
      this._decorators.map((dec) => dec.toDSL()).join('') +
      this._prefix +
      this._name +
      this._afterName +
      this._fieldGroups.toDSL() +
      this._applyTotals.map((at) => at.toDSL()).join('') +
      (this._overrides ? this._overrides.toDSL() : '') +
      this._after
    );
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
   * Retrieves a `Total` object by index.
   *
   * @param index - index of the total to get.
   */
  public getTotal(index: number): Total {
    return this._totals.getItem(index) as Total;
  }

  /**
   * Get the totals of the table.
   */
  public get totals(): Totals {
    return this._totals;
  }

  /**
   * Set the totals of the table.
   *
   * @param value - The new Totals object to associate with this table.
   * @throws {Error} If observer logic fails during reattachment.
   */
  @notifyObserver()
  public set totals(value: Totals) {
    // Attach the new Totals container to this table
    value.attach(this);

    // If there's no Apply at `_applyIndex`, replace `_applyTotals` fully
    if (this._applyIndex == null) {
      const totalsArray = [];

      for (let i = 0; i < value.length; i++) {
        totalsArray.push(value.getItem(i));
      }

      this._applyTotals = [...totalsArray];
    } else {
      // If there's an Apply, keep only that apply in `_applyTotals` and set index to 0
      const applyItem = this._applyTotals[this._applyIndex];
      this._applyTotals = [applyItem];
      this._applyIndex = 0;
    }

    // Detach the old Totals container, if any
    this._totals.detach();
    this._totals = value;
  }

  /**
   * Gets the raw table name, as stored internally.
   */
  public get rawName(): string {
    return this._name;
  }

  /**
   * Sets the raw table name without escaping it.
   *
   * @param value - The new raw name to set.
   */
  @notifyObserver()
  public set rawName(value: string) {
    this._name = value;
  }

  /**
   * Appends a new Total to the end of `_applyTotals`.
   *
   * @param value - The Total object to append.
   */
  private onTotalAppend(value: Total): void {
    this._applyTotals.push(value);
  }

  /**
   * Replaces the Total at the given index, with a new Total value.
   *
   * @param index - The zero-based index of the total, excluding any Apply offset.
   * @param value - The new Total to set.
   */
  private onTotalReplace(index: number, value: Total): void {
    const realIndex = this.totalIndex(index);
    this._applyTotals[realIndex] = value;
  }

  /**
   * Inserts a new Total at the given index.
   *
   * @param index - The zero-based index among totals.
   * @param value - The Total to insert.
   */
  private onTotalInsert(index: number, value: Total): void {
    const realIndex = this.totalIndex(index);
    this._applyTotals.splice(realIndex, 0, value);

    if (this._applyIndex !== null && realIndex < this._applyIndex) {
      this._applyIndex++;
    }
  }

  /**
   * Removes the Total at the given index.
   *
   * @param index - The zero-based index among totals.
   */
  private onTotalRemove(index: number): void {
    const realIndex = this.totalIndex(index);
    this._applyTotals.splice(realIndex, 1);

    if (this._applyIndex !== null && realIndex < this._applyIndex) {
      this._applyIndex--;
    }
  }

  /**
   * Converts a zero-based total index (excluding any Apply) to the correct index in `_applyTotals`.
   *
   * @param index - The zero-based total index.
   * @returns The actual index in `_applyTotals`.
   */
  private totalIndex(index: number): number {
    return this._applyIndex === null || index < this._applyIndex
      ? index
      : index + 1;
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
        if (item.fieldGroups.length === 0) {
          indexesToRemove.push(i);
        }
      }
    }

    indexesToRemove.reverse().forEach((idx) => {
      const removed = this._applyTotals.splice(idx, 1)[0];
      if (this._applyIndex !== null && idx < this._applyIndex) {
        this._applyIndex--;
      }
      if (removed.observer === this) {
        removed.detach();
      }
    });
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
   * Gets the current doc string text.
   */
  public get docString(): string | null {
    return this._docString.text;
  }

  /**
   * Sets the doc string text. If set to `null`, clears all doc lines.
   */
  public set docString(value: string | null) {
    this._docString.text = value;
  }

  /**
   * Retrieves a FieldGroups.
   */
  public get fieldGroups(): FieldGroups {
    return this._fieldGroups;
  }

  /**
   * Sets the FieldGroups, detaching the old one and attaching the new one.
   * @param value - The new FieldGroups object to set.
   */
  @notifyObserver()
  public set fieldGroups(value: FieldGroups) {
    value.attach(this);
    this._fieldGroups.detach();
    this._fieldGroups = value;
  }

  /**
   * Moves a FieldGroup (or raw string snippet) before or after another FieldGroup.
   *
   * @param sourceFieldName - The name of the Field to move.
   * @param targetFieldName - The name of the Field to move before or after.
   * @param isBefore - Whether to move the source *before* the target (else after).
   */
  @notifyObserver()
  public moveFieldBeforeOrAfter(
    sourceFieldName: string,
    targetFieldName: string | null,
    isBefore: boolean
  ): void {
    // 1) Locate the source field (which group it's in, and the index inside that group).
    const { groupIndex: srcGroupIndex } =
      this.findFieldLocation(sourceFieldName);
    const sourceGroup = this._fieldGroups.getItem(srcGroupIndex);

    // 2) Retrieve the actual Field object and the group's formula.
    const sourceField = sourceGroup.getField(sourceFieldName);
    const oldFormula = sourceGroup.formula;

    // 3) Remove this field from the old group.
    sourceGroup.removeField(sourceFieldName);

    // 4) If that group is now empty, remove the entire group.
    if (sourceGroup.fieldCount === 0) {
      this._fieldGroups.deleteItem(srcGroupIndex);
    }

    // 5) Create a new FieldGroup with the same formula as the old group.
    const newGroup = FieldGroup.fromField(sourceField, oldFormula ?? null);

    // 6) If there's no target field name, just append this new group at the end.
    if (!targetFieldName) {
      this._fieldGroups.append(newGroup);

      return;
    }

    // 7) Otherwise, find the group containing the target field.
    const { groupIndex: tgtGroupIndex } =
      this.findFieldLocation(targetFieldName);

    // 8) Compute the insertion index for the new group: before or after the target group.
    let insertIndex = tgtGroupIndex;
    if (!isBefore) {
      insertIndex++;
    }

    // 9) If insertion index is beyond the last, append instead.
    if (insertIndex >= this._fieldGroups.length) {
      this._fieldGroups.append(newGroup);
    } else {
      this._fieldGroups.insert(insertIndex, newGroup);
    }
  }

  /**
   * Finds which FieldGroup contains the named field, and the index of that field within the group.
   * @throws if not found
   */
  private findFieldLocation(fieldName: string): {
    groupIndex: number;
    fieldIndex: number;
  } {
    let groupIndex = 0;
    for (const group of this._fieldGroups) {
      const nameArray = Array.from(group.fieldNames);
      const idx = nameArray.indexOf(fieldName);
      if (idx !== -1) {
        return {
          groupIndex,
          fieldIndex: idx,
        };
      }
      groupIndex += 1;
    }
    throw new Error(`Field '${fieldName}' not found in any FieldGroup.`);
  }

  /**
   * Adapter method.
   * Adds a single new field (with an optional formula) to the table
   * by creating a new FieldGroup containing exactly one Field.
   */
  public addField({
    name,
    formula,
    isKey,
    isDim,
  }: {
    name: string;
    formula?: string | null;
    isKey?: boolean;
    isDim?: boolean;
  }): void {
    const field = new Field(name);

    if (isKey) {
      field.key = true;
    }

    if (isDim) {
      field.dim = true;
    }

    const group = FieldGroup.fromField(field, formula ?? null);
    this._fieldGroups.append(group);
  }

  /**
   * Adapter method.
   * Finds and returns a Field by its name from among all FieldGroups.
   * Throws an error if not found.
   */
  public getField(name: string): Field {
    for (const group of this._fieldGroups) {
      const foundField = group.hasField(name);
      if (foundField) {
        return group.getField(name);
      }
    }
    throw new Error(`Field '${name}' not found in any FieldGroup.`);
  }

  /**
   * Adapter method.
   * Finds and returns the FieldGroup that contains a field with the given name.
   */
  public getFieldGroupByFieldName(name: string): FieldGroup | null {
    for (const group of this._fieldGroups) {
      if (group.hasField(name)) {
        return group;
      }
    }

    return null;
  }

  /**
   * Adapter method.
   * Removes a Field by name from among all FieldGroups.
   * If removing Field causes its group to become empty, the entire group is removed.
   *
   * @param name - The name of the field to remove.
   */
  public removeField(name: string): void {
    let groupIndex = 0;
    for (const group of this._fieldGroups) {
      const index = Array.from(group.fieldNames).indexOf(name);
      if (index !== -1) {
        const targetField = group.getField(name);
        const shouldAddDimAfterRemove = targetField.dim;

        group.removeField(name);
        if (group.fieldCount === 0) {
          this._fieldGroups.deleteItem(groupIndex);
        } else if (shouldAddDimAfterRemove) {
          group.getFieldByIndex(0).dim = true;
        }

        return;
      }

      groupIndex += 1;
    }
  }

  /**
   * Adapter method.
   * Find FieldGroup for the field and set its formula.
   * @param fieldName - The name of the field to set the formula for.
   * @param formula - The new formula to set.
   */
  public setFieldFormula(fieldName: string, formula: string | null): void {
    const { groupIndex } = this.findFieldLocation(fieldName);
    const group = this._fieldGroups.getItem(groupIndex);
    group.formula = formula;
  }

  @notifyObserver()
  public swapFields(rightFieldName: string, leftFieldName: string): void {
    // Locate each field's group and index
    const { groupIndex: gRight, fieldIndex: iRight } =
      this.findFieldLocation(rightFieldName);
    const { groupIndex: gLeft, fieldIndex: iLeft } =
      this.findFieldLocation(leftFieldName);

    // If they're in different groups, swap entire groups
    if (gRight !== gLeft) {
      this.swapGroups(gRight, gLeft);

      return;
    }

    // Otherwise, they're in the same group, so swap the fields by index
    const group = this._fieldGroups.getItem(gRight);
    group.swapFieldPositions(iRight, iLeft);
  }

  /**
   * Swaps two entire FieldGroups in `_fieldGroups`, identified by their zero-based groupIndex.
   */
  private swapGroups(indexA: number, indexB: number): void {
    if (indexA === indexB) return;

    // Ensure indexA < indexB so we remove the higher index first
    if (indexA > indexB) {
      [indexA, indexB] = [indexB, indexA];
    }

    // Retrieve references
    const groupA = this._fieldGroups.getItem(indexA);
    const groupB = this._fieldGroups.getItem(indexB);

    // We can remove groupB first, then remove groupA,
    // and re-insert them in swapped order.
    this._fieldGroups.deleteItem(indexB);
    this._fieldGroups.deleteItem(indexA);

    if (this._fieldGroups.length <= indexA) {
      // Append groups if they were at the end
      this._fieldGroups.append(groupB);
      this._fieldGroups.append(groupA);
    } else {
      // Re-insert groups in swapped order
      this._fieldGroups.insert(indexA, groupB);
      this._fieldGroups.insert(indexB, groupA);
    }
  }

  /**
   * Checks whether this table has a decorator with the given name.
   *
   * @param name - The decorator name to search for.
   * @returns True if a decorator with this name exists, otherwise false.
   */
  public hasDecorator(name: string): boolean {
    return name in this._decoratorIndices;
  }

  /**
   * Retrieves a decorator by name.
   *
   * @param name - The decorator name to find.
   * @returns The matching Decorator.
   */
  public getDecorator(name: string): Decorator {
    const index = this.findDecorator(name);
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
    this._decoratorIndices[decorator.name] = this._decorators.length;
    this._decorators.push(decorator);
  }

  /**
   * Inserts a decorator at a specified position in this table’s decorator list.
   *
   * @param index - The zero-based index at which to insert the new decorator.
   * @param decorator - The decorator instance to insert.
   * @throws {Error} If the index is out of bounds.
   */
  @notifyObserver()
  public insertDecorator(index: number, decorator: Decorator): void {
    if (index < 0 || index > this._decorators.length) {
      throw new Error(
        `Decorator index ${index} is out of bounds: valid indices range from 0 to ${this._decorators.length}.`
      );
    }

    decorator.attach(this);
    this._decorators.splice(index, 0, decorator);
    this.updateDecoratorIndices();
  }

  /**
   * Removes a decorator from this table by name, detaching it from observer notifications.
   *
   * @param name - The decorator name to remove.
   * @returns The removed Decorator.
   */
  @notifyObserver()
  public removeDecorator(name: string): Decorator {
    const index = this.findDecorator(name);
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
  private findDecorator(name: string): number {
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
   * Called before property changes or modifications in child elements (decorators, field groups).
   *  Notifies this table's observer, then handles rename events for decorators.
   *
   * @param event - The event describing the pending change.
   */
  override notifyBefore(event: Event): void {
    if (this.observer) {
      this.observer.notifyBefore(event);
    }

    const sender = event.sender;
    if (
      sender instanceof Decorator &&
      event.methodName === 'name' &&
      sender.observer === this
    ) {
      this.onDecoratorRename(sender.name, event.kwargs['value']);
    }
  }

  override notifyAfter(event: Event): void {
    if (this.observer) {
      this.observer.notifyAfter(event);
    }

    if (event.sender instanceof Totals) {
      switch (event.methodName) {
        case 'append':
          this.onTotalAppend(event.kwargs['args'][0]);
          break;
        case 'setItem':
          this.onTotalReplace(event.kwargs['args'][0], event.kwargs['args'][1]);
          break;
        case 'insert':
          this.onTotalInsert(event.kwargs['args'][0], event.kwargs['args'][1]);
          break;
        case 'deleteItem':
        case 'pop':
          this.onTotalRemove(event.kwargs['args'][0]);
          break;
        default:
          break;
      }
    }
  }

  /**
   * Handles a decorator renaming event, updating `_decoratorIndices` so the new name is recognized.
   *
   * @param oldName - The old decorator name.
   * @param newName - The new decorator name.
   */
  private onDecoratorRename(oldName: string, newName: string): void {
    const idx = this.findDecorator(oldName);
    if (idx === -1) {
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
    this._decorators.forEach((decor, i) => {
      this._decoratorIndices[decor.name] = i;
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
    const result = new Table('');
    result._before = reader.next((d) => d.span.from);

    // docs
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

    // prefix + table name + after_name
    result._prefix = reader.next((d) => d.name.span.from);
    result._name = reader.next((d) => d.name.span.to);
    result._afterName = reader.tillLinebreak();
    result.fieldGroups = FieldGroups.deserialize(reader);

    // apply + totals
    const applyTotalEntities: any[] = [];
    const applyEntity = reader.entity?.apply;
    if (applyEntity) {
      applyTotalEntities.push(applyEntity);
    }
    const totalsEntities = reader.entity?.totals ?? [];
    for (const totalEntity of totalsEntities) {
      applyTotalEntities.push(totalEntity);
    }
    // sort by position
    applyTotalEntities.sort((a, b) => a.span.from - b.span.from);

    for (const applyTotalEntity of applyTotalEntities) {
      if (applyTotalEntity === applyEntity) {
        // parse apply
        const applyReader = reader.withEntity(applyEntity);
        const applyObj = Apply.deserialize(applyReader);
        result._applyIndex = result._applyTotals.length;
        result._applyTotals.push(applyObj);
        applyObj.attach(result);
        reader.position = applyReader.position;
      } else {
        // parse total
        const totalReader = reader.withEntity(applyTotalEntity);
        const totalObj = Total.deserialize(totalReader);
        result._totals.append(totalObj);
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

    result._after = reader.next((d) => d.span.to);
    result.updateDecoratorIndices();

    return result;
  }
}
