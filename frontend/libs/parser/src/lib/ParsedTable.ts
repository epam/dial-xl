import { FieldKey } from './FieldKey';
import { ParsedDecorator } from './ParsedDecorator';
import { DSLPlacement, ParsedField } from './ParsedField';
import { ParsedOverride } from './ParsedOverride';
import { dynamicFieldName } from './parser';

type FullDSLPlacement = {
  startOffset: number;
  stopOffset: number;
  startLine: number;
  stopLine: number;
  startColumn: number;
};

type DSLTableNamePlacement = {
  start: number;
  end: number;
};

export class ParsedTable {
  constructor(
    public tableName: string,
    public fields: ParsedField[],
    public dslPlacement: FullDSLPlacement | undefined,
    public dslTableNamePlacement: DSLTableNamePlacement | undefined,
    public decorators: ParsedDecorator[],
    public overrides: ParsedOverride | undefined,
    public dslOverridePlacement: DSLPlacement | undefined,
    public isTableNameQuoted: boolean
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

  public addDynamicFields(dynamicFields: string[]) {
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

    this.fields.splice(dynamicFieldIndex + 1, 0, ...newFields);
  }

  public getFieldsCount() {
    return this.fields.filter((f) => f.key.fieldName !== dynamicFieldName)
      .length;
  }

  public getFieldByIndex(index: number) {
    let currentIndex = 0;

    for (const field of this.fields) {
      if (field.key.fieldName === dynamicFieldName) continue;

      if (currentIndex === index) return field;

      currentIndex++;
    }

    return null;
  }
}
