import { Expression } from './ast';
import { FieldKey } from './FieldKey';
import { ParsedDecorator } from './ParsedDecorator';
import {
  DSLNote,
  ExpressionMetadata,
  fieldColSizeDecoratorName,
  ShortDSLPlacement,
} from './parser';

export class ParsedField {
  constructor(
    public isKey: boolean,
    public isDim: boolean,
    public isDynamic: boolean,
    public key: FieldKey,
    public expression?: Expression | undefined,
    public expressionMetadata?: ExpressionMetadata | undefined,
    public dslPlacement?: ShortDSLPlacement | undefined,
    public dslFieldNamePlacement?: ShortDSLPlacement | undefined,
    public dslDimensionPlacement?: ShortDSLPlacement | undefined,
    public dslKeyPlacement?: ShortDSLPlacement | undefined,
    public decorators?: ParsedDecorator[] | undefined,
    public note?: DSLNote | undefined
  ) {}

  getSize(): number {
    return (
      this.decorators?.find(
        (dec) => dec.decoratorName === fieldColSizeDecoratorName
      )?.params?.[0]?.[0] ?? 1
    );
  }
}
