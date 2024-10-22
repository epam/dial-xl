import { FieldKey } from './FieldKey';
import { ParsedApply } from './ParsedApply';
import { ParsedDecorator } from './ParsedDecorator';
import { ParsedField } from './ParsedField';
import { ParsedOverride } from './ParsedOverride';
import { ParsedTotal } from './ParsedTotal';
import {
  dynamicFieldName,
  FullDSLPlacement,
  hideTableFieldsDecoratorName,
  hideTableHeaderDecoratorName,
  horizontalDirectionDecoratorName,
  ShortDSLPlacement,
} from './parser';

export class ParsedTable {
  constructor(
    public tableName: string,
    public fields: ParsedField[],
    public text: string,
    public dslPlacement: FullDSLPlacement | undefined,
    public dslTableNamePlacement: ShortDSLPlacement | undefined,
    public decorators: ParsedDecorator[],
    public overrides: ParsedOverride | undefined,
    public dslOverridePlacement: FullDSLPlacement | undefined,
    public apply: ParsedApply | undefined,
    public total: ParsedTotal | undefined
  ) {}

  public getPlacement(): [number, number] {
    const placement = this.decorators.find(
      (decorator) => decorator.decoratorName === 'placement'
    );

    if (!placement || placement.params.length === 0) return [1, 1];

    return placement.params[0];
  }

  public hasPlacement() {
    return !!this.decorators.find(
      (decorator) => decorator.decoratorName === 'placement'
    );
  }

  public getTableFieldsSizes(): number {
    return this.fields
      .filter((f) => f.key.fieldName !== dynamicFieldName)
      .reduce((acc, curr) => acc + curr.getSize(), 0);
  }

  public hasDynamicFields() {
    return !!this.fields.find(
      (field) => field.key.fieldName === dynamicFieldName
    );
  }

  public isChart() {
    return this.isLineChart() || this.isTabularChart();
  }

  public isLineChart() {
    return !!this.decorators.find(
      (decorator) =>
        decorator.decoratorName === 'visualization' &&
        decorator.params.length > 0 &&
        decorator.params[0].includes('line-chart')
    );
  }

  public isTabularChart() {
    return !!this.decorators.find(
      (decorator) =>
        decorator.decoratorName === 'visualization' &&
        decorator.params.length > 0 &&
        decorator.params[0].includes('tabular-chart')
    );
  }

  public getChartSize(): [number, number] {
    const placement = this.decorators.find(
      (decorator) => decorator.decoratorName === 'size'
    );

    if (!placement || placement.params.length === 0) return [0, 0];

    return placement.params[0];
  }

  public isManual() {
    return !!this.decorators.find(
      (decorator) => decorator.decoratorName === 'manual'
    );
  }

  public hasKeys() {
    return this.fields.some((field) => field.isKey);
  }

  public getFieldsWithoutDynamicVirtual() {
    return this.fields.filter((f) => !f.isDynamic);
  }

  public getFieldsWithoutDynamic() {
    return this.fields.filter(
      (f) => f.key.fieldName !== dynamicFieldName && !f.isDynamic
    );
  }

  public setDynamicFields(dynamicFields: string[]) {
    const newFields = [];

    const dynamicField = this.fields.find(
      (f) => f.key.fieldName === dynamicFieldName
    );

    for (const fieldName of dynamicFields) {
      if (this.fields.find((f) => f.key.fieldName === fieldName)) continue;

      newFields.push(
        new ParsedField(
          false,
          false,
          true,
          new FieldKey(this.tableName, `[${fieldName}]`, fieldName),
          dynamicField?.expression,
          dynamicField?.expressionMetadata
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

  public getTableNameHeaderHeight() {
    return this.getIsTableHeaderHidden() ? 0 : 1;
  }

  public getTableFieldsHeaderHeight() {
    return this.getIsTableFieldsHidden() ? 0 : 1;
  }

  public getFieldByColumnIndex(index: number) {
    let currentIndex = 0;

    for (const field of this.fields) {
      if (field.key.fieldName === dynamicFieldName) continue;

      if (currentIndex === index) return field;

      const isHorizontal = this.getIsTableDirectionHorizontal();
      currentIndex += isHorizontal ? 1 : field.getSize();
    }

    return null;
  }

  public getIsTableHeaderHidden(): boolean {
    return this.decorators.some(
      (dec) => dec.decoratorName === hideTableHeaderDecoratorName
    );
  }

  public getIsTableFieldsHidden(): boolean {
    return this.decorators.some(
      (dec) => dec.decoratorName === hideTableFieldsDecoratorName
    );
  }

  public getIsTableDirectionHorizontal(): boolean {
    return this.decorators.some(
      (dec) => dec.decoratorName === horizontalDirectionDecoratorName
    );
  }

  public getTotalSize(): number {
    return this.total?.size || 0;
  }
}
