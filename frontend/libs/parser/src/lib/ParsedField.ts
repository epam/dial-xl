import { Expression } from './ast';
import { FieldKey } from './FieldKey';
import { ParsedDecorator } from './ParsedDecorator';

export interface ExpressionMetadata {
  text: string;
  start: number;
  end: number;
}

export type DSLPlacement = {
  start: number;
  end: number;
};

export class ParsedField {
  constructor(
    public isKey: boolean,
    public isDim: boolean,
    public isDynamic: boolean,
    public key: FieldKey,
    public expression?: Expression | undefined,
    public expressionMetadata?: ExpressionMetadata | undefined,
    public dslPlacement?: DSLPlacement | undefined,
    public dslFieldNamePlacement?: DSLPlacement | undefined,
    public dslDimensionPlacement?: DSLPlacement | undefined,
    public dslKeyPlacement?: DSLPlacement | undefined,
    public decorators?: ParsedDecorator[] | undefined
  ) {}
}
