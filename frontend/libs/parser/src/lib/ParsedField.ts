import { Expose } from 'class-transformer';

import { Expression } from './ast';
import { FieldKey } from './FieldKey';
import { ParsedDecorator } from './ParsedDecorator';
import { ParsedText } from './ParsedText';
import {
  chartDotColorDecoratorName,
  chartDotSizeDecoratorName,
  chartSelectorDecoratorName,
  chartSeparatorDecoratorName,
  chartSeriesColorDecoratorName,
  chartXAxisDecoratorName,
  descriptionDecoratorName,
  DSLNote,
  ExpressionMetadata,
  fieldColSizeDecoratorName,
  indexDecoratorName,
  ShortDSLPlacement,
} from './parser';
import { Span } from './Span';

export class ParsedField {
  @Expose()
  public span: Span | undefined;

  @Expose()
  public name: ParsedText | undefined;

  @Expose({ name: 'key' })
  public keyKeyword: ParsedText | undefined;

  @Expose()
  public dim: ParsedText | undefined;

  public formula: ParsedText | undefined;

  @Expose()
  public decorators?: ParsedDecorator[] | undefined;

  @Expose()
  public docs: ParsedText[];

  constructor(
    public key: FieldKey,
    public isDynamic: boolean,
    public expression: Expression | undefined = undefined,
    public expressionMetadata: ExpressionMetadata | undefined = undefined,
    public fieldGroupIndex: number,
    span: Span | undefined = undefined,
    name: ParsedText | undefined = undefined,
    keyKeyword: ParsedText | undefined = undefined,
    dim: ParsedText | undefined = undefined,
    formula: ParsedText | undefined = undefined,
    docs: ParsedText[] = [],
    public dslPlacement?: ShortDSLPlacement | undefined,
    decorators?: ParsedDecorator[] | undefined,
    public note?: DSLNote | undefined,
    public groupDim = false
  ) {
    this.span = span;
    this.name = name;
    this.keyKeyword = keyKeyword;
    this.dim = dim;
    this.formula = formula;
    this.decorators = decorators;
    this.docs = docs;
  }

  public get isKey(): boolean {
    return this.keyKeyword !== undefined;
  }

  public get isDim(): boolean {
    return this.groupDim;
  }

  public getSize(): number {
    return Number(this.getDecoratorParam(fieldColSizeDecoratorName) ?? 1);
  }

  public hasSizeDecorator(): boolean {
    return this.hasDecorator(fieldColSizeDecoratorName);
  }

  public isChartSelector(): boolean {
    return this.hasDecorator(chartSelectorDecoratorName);
  }

  public getChartSelectorValue(): string | number | undefined {
    return this.getDecoratorParam(chartSelectorDecoratorName);
  }

  public getSeriesColor(): string | undefined {
    const color = this.getDecoratorParam(chartSeriesColorDecoratorName);
    if (!color) return undefined;

    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/i.test(color)
      ? color
      : undefined;
  }

  public isChartXAxis(): boolean {
    return this.hasDecorator(chartXAxisDecoratorName);
  }

  public isChartSeparator(): boolean {
    return this.hasDecorator(chartSeparatorDecoratorName);
  }

  public isChartDotSize(): boolean {
    return this.hasDecorator(chartDotSizeDecoratorName);
  }

  public isChartDotColor(): boolean {
    return this.hasDecorator(chartDotColorDecoratorName);
  }

  public isIndex(): boolean {
    return this.hasDecorator(indexDecoratorName);
  }

  public isDescription(): boolean {
    return this.hasDecorator(descriptionDecoratorName);
  }

  public getDescriptionFieldName(): string | undefined {
    return this.getDecoratorParam(descriptionDecoratorName);
  }

  private getDecorator(decoratorName: string): ParsedDecorator | undefined {
    return this.decorators?.find((dec) => dec.decoratorName === decoratorName);
  }

  private hasDecorator(decoratorName: string): boolean {
    return !!this.getDecorator(decoratorName);
  }

  private getDecoratorParam(
    decoratorName: string,
    paramIndex = 0,
    valueIndex = 0
  ): string | undefined {
    return this.getDecorator(decoratorName)?.params?.[paramIndex]?.[valueIndex];
  }
}
