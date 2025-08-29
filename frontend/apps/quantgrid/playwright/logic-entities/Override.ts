export class Override {
  private name: string;

  private values: Map<number, string>;

  public getName() {
    return this.name;
  }

  public getSize() {
    return this.values.size;
  }

  public getValue(ind: number) {
    return this.values.get(ind);
  }

  constructor(name: string, values: Map<number, string>) {
    this.name = name;
    this.values = values;
  }

  public updateName(newName: string) {
    this.name = newName;
  }

  public updateValue(index: number, value: string) {
    this.values.set(index, value);
  }

  public removeValue(index: number) {
    this.values.delete(index);
  }

  public getMaxKey() {
    let max = 0;
    for (const x of this.values) {
      if (x[0] > max) max = x[0];
    }

    return max;
  }
}
