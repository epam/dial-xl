export class ParsedDecorator {
  public params: any[];

  constructor(
    public decoratorName: string,
    public dslPlacement: { start: number; end: number },
    ...params: any[]
  ) {
    this.params = [...params];
  }
}
