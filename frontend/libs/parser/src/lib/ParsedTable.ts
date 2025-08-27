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
  manualTableDecoratorName,
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
    public note?: DSLNote | undefined
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
      []
    );

    this.isPivot = this.fields.some(
      (f) =>
        f.expression &&
        findFunctionExpressions(f.expression).some(
          (func) => func.name === 'PIVOT'
        )
    );
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
      (field) => field.key.fieldName === dynamicFieldName
    );
  }

  public isManual(): boolean {
    return this.hasDecorator(manualTableDecoratorName);
  }

  public hasKeys() {
    return this.fields.some((field) => field.isKey);
  }

  public getKeys() {
    return this.fields.filter((field) => field.isKey);
  }

  public getFieldsWithoutDynamicVirtual() {
    return this.fields.filter((f) => !f.isDynamic);
  }

  public getFieldsWithoutDynamic() {
    return this.fields.filter(
      (f) => f.key.fieldName !== dynamicFieldName && !f.isDynamic
    );
  }

  public getDynamicField(): ParsedField | undefined {
    return this.fields.find((f) => f.key.fieldName === dynamicFieldName);
  }

  public setDynamicFields(dynamicFields: string[]) {
    const newFields = [];
    const dynamicField = this.getDynamicField();

    if (!dynamicField) return;

    // For cases when dynamic fields are changed after dsl changes
    // remove old dynamic fields to avoid stale fields in the table
    this.fields = this.fields.filter(
      (f) => !f.isDynamic || dynamicFields.includes(f.key.fieldName)
    );

    for (const fieldName of dynamicFields) {
      if (this.fields.find((f) => f.key.fieldName === fieldName)) continue;

      newFields.push(
        new ParsedField(
          new FieldKey(this.tableName, `[${fieldName}]`, fieldName),
          true,
          dynamicField.expression,
          dynamicField.expressionMetadata,
          dynamicField.fieldGroupIndex
        )
      );
    }

    const dynamicFieldIndex = this.fields.findIndex(
      (f) => f.key.fieldName === dynamicFieldName
    );

    if (dynamicFieldIndex === -1 || newFields.length === 0) return;

    this.fields = [
      ...this.fields.slice(0, dynamicFieldIndex),
      ...newFields,
      ...this.fields.slice(dynamicFieldIndex),
    ];
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
    fieldName: string
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
      (decorator) => decorator.decoratorName === decName
    );
  }

  private hasDecorator(decName: string): boolean {
    return !!this.getDecorator(decName);
  }

  private getDecoratorParams(decName: string): any[][] | undefined {
    return this.getDecorator(decName)?.params;
  }
}
