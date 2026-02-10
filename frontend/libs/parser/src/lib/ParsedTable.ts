import { Expose } from 'class-transformer';

import { FieldKey } from './FieldKey';
import { ParsedApply } from './ParsedApply';
import { ParsedDecorator } from './ParsedDecorator';
import { ParsedField } from './ParsedField';
import { ParsedFields } from './ParsedFields';
import { ParsedOverride } from './ParsedOverride';
import { ParsedText } from './ParsedText';
import { ParsedTotal } from './ParsedTotal';
import { ParsedTotals } from './ParsedTotals';
import {
  chartHorizontalDecoratorArg,
  chartSelectorDecoratorName,
  ChartType,
  DSLNote,
  dynamicFieldName,
  fieldColSizeDecoratorName,
  FieldHeaderPlacement,
  FullDSLPlacement,
  layoutDecoratorName,
  legendPositionDecoratorName,
  manualTableDecoratorName,
  showVisualMapDecoratorName,
  tableControlDecoratorName,
  unknownDynamicNamePrefix,
  visualizationDecoratorName,
} from './parser';
import { findFunctionExpressions, getLayoutParams } from './services';
import { Span } from './Span';

// TODO: need a cleanup after implement DSL edit
export class ParsedTable {
  @Expose()
  span: Span;

  @Expose()
  name: ParsedText;

  @Expose({ name: 'fields' })
  parsedFields: ParsedFields[];

  @Expose()
  public decorators: ParsedDecorator[];

  @Expose()
  public docs: ParsedText[];

  @Expose()
  overrides: ParsedOverride | undefined;

  @Expose()
  public apply: ParsedApply | undefined;

  @Expose()
  public totals: ParsedTotals[] | undefined;

  public fields: ParsedField[];

  public isPivot: boolean;

  constructor(
    span: Span,
    name: ParsedText,
    public tableName: string,
    fields: ParsedFields[],
    public text: string,
    public dslPlacement: FullDSLPlacement | undefined,
    decorators: ParsedDecorator[],
    docs: ParsedText[],
    overrides: ParsedOverride | undefined,
    apply: ParsedApply | undefined,
    totals: ParsedTotals[] | undefined,
    public total: ParsedTotal | undefined,
    public note?: DSLNote | undefined,
  ) {
    this.span = span;
    this.name = name;
    this.tableName = tableName;
    this.parsedFields = fields;
    this.decorators = decorators;
    this.docs = docs;
    this.overrides = overrides;
    this.apply = apply;
    this.totals = totals;

    this.fields = fields.reduce<ParsedField[]>(
      (acc, curr) => acc.concat(curr.fields),
      [],
    );

    try {
      this.isPivot = this.fields.some(
        (f) =>
          f.expression &&
          findFunctionExpressions(f.expression).some(
            (func) => func.name === 'PIVOT',
          ),
      );
    } catch (e) {
      this.isPivot = false;
    }
  }

  public getPlacement(): [number, number] {
    const layout = this.getDecorator(layoutDecoratorName);

    if (!layout || layout.params.length === 0) return [1, 1];

    const layoutParams = layout.params[0];

    if (
      Array.isArray(layoutParams) &&
      layoutParams.length >= 2 &&
      typeof layoutParams[0] === 'number' &&
      typeof layoutParams[1] === 'number'
    ) {
      return [layoutParams[0], layoutParams[1]];
    } else {
      return [1, 1];
    }
  }

  public hasPlacement(): boolean {
    return this.hasDecorator(layoutDecoratorName);
  }

  public getTableFieldsSizes(): number {
    return this.fields
      .filter((f) => f.key.fieldName !== dynamicFieldName)
      .reduce((acc, curr) => acc + curr.getSize(), 0);
  }

  public hasDynamicFields(): boolean {
    return !!this.fields.find(
      (field) => field.key.fieldName === dynamicFieldName,
    );
  }

  public isManual(): boolean {
    return this.hasDecorator(manualTableDecoratorName);
  }

  public hasKeys(): boolean {
    return this.fields.some((field) => field.isKey);
  }

  public getKeys(): ParsedField[] {
    return this.fields.filter((field) => field.isKey);
  }

  public getFieldsWithoutDynamicVirtual(): ParsedField[] {
    return this.fields.filter((f) => !f.isDynamic);
  }

  public getFieldsWithoutDynamic(): ParsedField[] {
    return this.fields.filter(
      (f) => f.key.fieldName !== dynamicFieldName && !f.isDynamic,
    );
  }

  public getUserVisibleFields(): ParsedField[] {
    return this.fields.filter(
      (f) =>
        f.key.fieldName !== dynamicFieldName &&
        !f.key.fieldName.startsWith(unknownDynamicNamePrefix),
    );
  }

  public getDynamicField(): ParsedField | undefined {
    return this.fields.find((f) => f.key.fieldName === dynamicFieldName);
  }

  /**
   * Updates the table's dynamic fields based on data received from the server.
   *
   * Supports two modes:
   * 1. Full replacement (when startColumn is undefined): Replaces all dynamic fields
   * 2. Partial update (when startColumn is defined): Updates a slice of dynamic fields
   *
   * @param dynamicFields - Array of field names to add/update
   * @param startColumn - Start index for partial updates (0-based)
   * @param endColumn - End index for partial updates
   * @param totalColumns - Total number of dynamic columns expected
   */
  public setDynamicFields(
    dynamicFields: (string | undefined)[] | undefined,
    startColumn?: number,
    endColumn?: number,
    totalColumns?: number,
  ) {
    const dynamicTemplate = this.getDynamicField();
    if (!dynamicTemplate) return;

    const isRangeUpdate = Number.isFinite(startColumn as number);

    // Mode 1: Full replacement of all dynamic fields
    if (!isRangeUpdate) {
      if (!dynamicFields || dynamicFields.length === 0) return;

      // Remove dynamic fields that are no longer present, keep those that are
      this.fields = this.fields.filter(
        (f) => !f.isDynamic || dynamicFields.includes(f.key.fieldName),
      );

      // Create ParsedField instances for newly discovered fields
      const newFields: ParsedField[] = [];
      for (const fieldName of dynamicFields) {
        // Skip undefined/null names or fields that already exist
        if (
          !fieldName ||
          this.fields.find((f) => f.key.fieldName === fieldName)
        ) {
          continue;
        }
        newFields.push(
          this.createDynamicParsedField(fieldName, dynamicTemplate),
        );
      }

      const virtualIndex = this.getDynamicVirtualFieldIndex();
      if (virtualIndex === -1 || newFields.length === 0) return;

      // Insert new fields immediately before the virtual '[*]' field
      this.fields = [
        ...this.fields.slice(0, virtualIndex),
        ...newFields,
        ...this.fields.slice(virtualIndex),
      ];

      return;
    }

    // Mode 2: Partial update of a range of dynamic fields
    // This happens during scrolling when new columns become visible
    const start = Math.max(0, parseInt(String(startColumn), 10) || 0);
    const slice = dynamicFields ?? [];

    // Calculate the end index: use provided value or infer from data
    const inferredEnd = Number.isFinite(endColumn as number)
      ? Math.max(start, parseInt(String(endColumn), 10) || start)
      : start + slice.length;

    // Determine the total size of the dynamic block
    const desiredTotal =
      typeof totalColumns === 'number' && totalColumns > 0
        ? totalColumns
        : Math.max(inferredEnd, start + slice.length);

    // Ensure the dynamic block has the correct number of placeholder fields
    const blockInfo = this.ensureDynamicBlockSize(
      desiredTotal,
      dynamicTemplate,
    );
    if (!blockInfo) return;

    const dynamicStartIndex = blockInfo.startIndex;
    const dynamicEndIndex = dynamicStartIndex + desiredTotal;

    // Update fields in the specified range
    for (let i = 0; i < slice.length; i++) {
      const columnIndex = start + i;

      // Skip out-of-bounds indices
      if (columnIndex < 0 || columnIndex >= desiredTotal) continue;

      const fieldName = slice[i];
      if (!fieldName) continue;

      const absolutePosition = dynamicStartIndex + columnIndex;
      const currentField = this.fields[absolutePosition];

      // Skip if the field is already set to this name
      if (currentField && currentField.key.fieldName === fieldName) continue;

      // Check for duplicates: if this field name exists elsewhere in the dynamic block,
      // replace it with a placeholder to avoid having the same field name twice
      const duplicatePosition = this.fields.findIndex(
        (f, position) =>
          position !== absolutePosition &&
          f.isDynamic &&
          f.key.fieldName === fieldName &&
          position >= dynamicStartIndex &&
          position < dynamicEndIndex,
      );

      if (duplicatePosition !== -1) {
        const relativeIndex = duplicatePosition - dynamicStartIndex;
        const placeholderName = this.getDynamicPlaceholderName(relativeIndex);
        this.fields[duplicatePosition] = this.createDynamicParsedField(
          placeholderName,
          dynamicTemplate,
        );
      }

      // Set the field at the correct position
      this.fields[absolutePosition] = this.createDynamicParsedField(
        fieldName,
        dynamicTemplate,
      );
    }
  }

  public getFieldsCount() {
    return this.fields.filter((f) => f.key.fieldName !== dynamicFieldName)
      .length;
  }

  public getFieldNames() {
    return this.getFieldsWithoutDynamicVirtual().map((f) => f.key.fieldName);
  }

  public getTableNameHeaderHeight() {
    return this.getIsTableHeaderHidden() ? 0 : 1;
  }

  public getTableFieldsHeaderHeight() {
    return this.getIsTableFieldsHidden() ? 0 : 1;
  }

  public getFieldByColumnIndex(index: number) {
    let currentIndex = 0;

    const isHorizontal = this.getIsTableDirectionHorizontal();

    for (const field of this.fields) {
      if (field.key.fieldName === dynamicFieldName) continue;

      const nextFieldIndex =
        currentIndex + (isHorizontal ? 1 : field.getSize());

      if (currentIndex === index || nextFieldIndex > index) return field;

      currentIndex = nextFieldIndex;
    }

    return null;
  }

  public getIndexByFieldName(fieldName: string): number {
    let currentIndex = 0;

    const isHorizontal = this.getIsTableDirectionHorizontal();

    for (const field of this.fields) {
      if (field.key.fieldName === dynamicFieldName) continue;

      if (field.key.fieldName === fieldName) return currentIndex;

      currentIndex += isHorizontal ? 1 : field.getSize();
    }

    return -1;
  }

  public getFieldHeaderPlacement(
    fieldName: string,
  ): FieldHeaderPlacement | null {
    const field = this.fields.find((f) => f.key.fieldName === fieldName);

    if (!field) return null;

    const fieldSize = field.getSize();
    const fieldIndex = this.getIndexByFieldName(fieldName);
    const isHorizontal = this.getIsTableDirectionHorizontal();
    const getTableNameHeaderHeight = this.getTableNameHeaderHeight();
    const [row, col] = this.getPlacement();

    if (isHorizontal) {
      const fieldRow = row + getTableNameHeaderHeight + fieldIndex;

      return {
        startRow: fieldRow,
        endRow: fieldRow,
        startCol: col,
        endCol: col,
      };
    }

    return {
      startRow: row + getTableNameHeaderHeight,
      endRow: row + getTableNameHeaderHeight,
      startCol: col + fieldIndex,
      endCol: col + fieldIndex + fieldSize - 1,
    };
  }

  public getIsTableHeaderHidden(): boolean {
    const layoutDecorator = this.getDecorator(layoutDecoratorName);

    const layoutParams = layoutDecorator
      ? getLayoutParams(layoutDecorator)
      : undefined;

    return !layoutParams?.showTableHeader;
  }

  public getIsTableFieldsHidden(): boolean {
    const layoutDecorator = this.getDecorator(layoutDecoratorName);

    const layoutParams = layoutDecorator
      ? getLayoutParams(layoutDecorator)
      : undefined;

    return !layoutParams?.showFieldHeaders;
  }

  public getIsTableDirectionHorizontal(): boolean {
    const layoutDecorator = this.getDecorator(layoutDecoratorName);

    const layoutParams = layoutDecorator
      ? getLayoutParams(layoutDecorator)
      : undefined;

    return !!layoutParams?.isHorizontal;
  }

  public getTotalSize(): number {
    return this.totals?.length || 0;
  }

  public isControl() {
    return this.hasDecorator(tableControlDecoratorName);
  }

  // Chart related methods

  public isChart() {
    return this.getChartType() !== null;
  }

  public getChartType(): ChartType | null {
    const params = this.getDecoratorParams(visualizationDecoratorName);
    if (!params || params.length === 0) return null;

    const chartType = params[0][0];
    const isChartType = Object.values(ChartType).includes(chartType);

    return isChartType ? chartType : null;
  }

  public getLegendPosition(): 'top' | 'bottom' | 'right' | 'left' {
    const decorator = this.getDecorator(legendPositionDecoratorName);

    if (!decorator || decorator.params.length === 0) return 'bottom';

    const position = decorator.params[0][0];
    const validPositions = ['top', 'bottom', 'right', 'left'];

    return validPositions.includes(position) ? position : 'bottom';
  }

  public getChartSize(): [number, number] {
    const params = this.getDecoratorParams(fieldColSizeDecoratorName);
    if (!params || params.length === 0) return [0, 0];

    return params[0] as [number, number];
  }

  public getChartSeparatedSections(): ParsedField[][] {
    const sections: ParsedField[][] = [[]];

    for (const field of this.fields) {
      let lastSection = sections[sections.length - 1];

      if (field.isChartSeparator() && lastSection.length > 0) {
        sections.push([]);
      }

      lastSection = sections[sections.length - 1];
      lastSection.push(field);
    }

    return sections;
  }

  public getChartOrientation(): 'horizontal' | 'vertical' {
    const visualizationParams = this.getVisualisationDecoratorValues();

    if (!visualizationParams || visualizationParams?.length <= 1)
      return 'vertical';

    return visualizationParams[1] === chartHorizontalDecoratorArg
      ? 'horizontal'
      : 'vertical';
  }

  public isChartVisualMapVisible(): boolean {
    return this.hasDecorator(showVisualMapDecoratorName);
  }

  public isChartSelector(): boolean {
    return this.hasDecorator(chartSelectorDecoratorName);
  }

  public getChartSelectorValues(): string[] | undefined {
    const params = this.getDecoratorParams(chartSelectorDecoratorName);

    return params?.[0]?.length ? params[0].map((p: string) => p) : undefined;
  }

  public getVisualisationDecoratorValues(): string | string[] | undefined {
    const params = this.getDecoratorParams(visualizationDecoratorName);

    return params?.[0]?.length ? params[0].map((p: string) => p) : undefined;
  }

  public getLayoutDecorator(): ParsedDecorator | undefined {
    return this.getDecorator(layoutDecoratorName);
  }

  private getDecorator(decName: string): ParsedDecorator | undefined {
    return this.decorators.find(
      (decorator) => decorator.decoratorName === decName,
    );
  }

  private hasDecorator(decName: string): boolean {
    return !!this.getDecorator(decName);
  }

  private getDecoratorParams(decName: string): any[][] | undefined {
    return this.getDecorator(decName)?.params;
  }

  /**
   * Generates a unique placeholder name for a dynamic field at the given index.
   * Placeholders are used to reserve space in the dynamic block before actual field names are discovered.
   *
   * @param index - 0-based index within the dynamic block
   * @returns Placeholder name like '__dyn__0', '__dyn__1', etc.
   */
  private getDynamicPlaceholderName(index: number): string {
    return `${unknownDynamicNamePrefix}${index}`;
  }

  /**
   * Creates a ParsedField instance for a dynamic field based on the '[*]' template.
   *
   * @param fieldName - The concrete field name
   * @param template - The virtual '[*]' field to use as a template
   * @returns A new ParsedField instance representing the dynamic field
   */
  private createDynamicParsedField(fieldName: string, template: ParsedField) {
    return new ParsedField(
      new FieldKey(this.tableName, `[${fieldName}]`, fieldName),
      true,
      template.expression,
      template.expressionMetadata,
      template.fieldGroupIndex,
    );
  }

  /**
   * Finds the starting index of the dynamic field block in this.fields array.
   *
   * Dynamic fields are stored contiguously immediately before the virtual '[*]' field.
   * This method scans backwards from the '[*]' field to find where the dynamic block starts.
   *
   * @returns The index where the dynamic block starts, or -1 if no '[*]' field exists
   */
  public getDynamicBlockStartIndex(): number {
    const virtualIndex = this.getDynamicVirtualFieldIndex();
    if (virtualIndex === -1) return -1;

    let start = virtualIndex;

    while (start - 1 >= 0 && this.fields[start - 1].isDynamic) {
      start--;
    }

    return start;
  }

  /**
   * Finds the index of the virtual '[*]' field in the this.fields array.
   *
   * The '[*]' field is a special placeholder in the DSL that marks where
   * dynamic fields should be expanded.
   *
   * @returns Index of the '[*]' field, or -1 if not found
   */
  private getDynamicVirtualFieldIndex(): number {
    return this.fields.findIndex((f) => f.key.fieldName === dynamicFieldName);
  }

  /**
   * Retrieves information about the current dynamic field block.
   *
   * @returns Object with block information, or null if no '[*]' field exists
   * @returns startIndex - Index where dynamic fields begin
   * @returns dynamicFields - Array of current dynamic ParsedField instances
   * @returns virtualIndex - Index of the '[*]' placeholder
   */
  private getCurrentDynamicBlock(): {
    startIndex: number;
    dynamicFields: ParsedField[];
    virtualIndex: number;
  } | null {
    const virtualIndex = this.getDynamicVirtualFieldIndex();
    if (virtualIndex === -1) return null;

    let startIndex = virtualIndex;

    while (startIndex - 1 >= 0 && this.fields[startIndex - 1].isDynamic) {
      startIndex--;
    }

    return {
      startIndex,
      dynamicFields: this.fields.slice(startIndex, virtualIndex),
      virtualIndex,
    };
  }

  /**
   * Ensures the dynamic field block has exactly the specified number of fields.
   *
   * This method resizes the dynamic block to match the total column count:
   * - If the block is too small: adds placeholder fields
   * - If the block is too large: removes excess fields
   * - Preserves existing fields by their index position
   *
   * Algorithm:
   * 1. Remove the current dynamic block from this.fields
   * 2. Build a new block with the correct size:
   *    - Reuse existing fields up to the new size (by index)
   *    - Fill remaining positions with placeholder fields
   * 3. Insert the new block before the '[*]' field
   *
   * This maintains the invariant that dynamic fields are always positioned
   * immediately before the virtual '[*]' field, with a fixed size.
   *
   * @param totalColumns - Desired total number of dynamic fields
   * @param template - The '[*]' field to use as a template for new fields
   * @returns Object with startIndex and totalColumns, or null if no '[*]' field exists
   */
  private ensureDynamicBlockSize(totalColumns: number, template: ParsedField) {
    const block = this.getCurrentDynamicBlock();
    if (!block) return null;

    const { startIndex, dynamicFields } = block;

    // Remove the entire existing dynamic block
    if (dynamicFields.length > 0) {
      this.fields.splice(startIndex, dynamicFields.length);
    }

    const nextDynamic: ParsedField[] = [];
    const keepCount = Math.min(dynamicFields.length, totalColumns);

    // Preserve existing fields by their index position (0-based)
    for (let i = 0; i < keepCount; i++) {
      nextDynamic.push(dynamicFields[i]);
    }

    // Fill remaining positions with placeholder fields
    // Placeholders will be replaced when actual field names are discovered
    for (let i = keepCount; i < totalColumns; i++) {
      const placeholderName = this.getDynamicPlaceholderName(i);
      nextDynamic.push(
        this.createDynamicParsedField(placeholderName, template),
      );
    }

    // Insert the resized block immediately before the virtual '[*]' field
    const newVirtualIndex = this.getDynamicVirtualFieldIndex();
    if (newVirtualIndex === -1) return null;

    this.fields.splice(newVirtualIndex, 0, ...nextDynamic);

    // After insertion, the dynamic block now starts where '[*]' used to be
    // (because we inserted before it, pushing it forward)
    return { startIndex: newVirtualIndex, totalColumns };
  }
}
