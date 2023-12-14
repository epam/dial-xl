import { Expression } from './ast';

export class ParsedFormula {
  constructor(public expression: Expression, public errors: string[]) {}
}
