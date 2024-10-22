import { ShortDSLPlacement } from './parser';

export class ParsedDecorator {
  public params: any[];

  constructor(
    public decoratorName: string,
    public dslPlacement: ShortDSLPlacement | undefined,
    ...params: any[]
  ) {
    this.params = [...params];
  }
}
