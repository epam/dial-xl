export class Field {
  private key: boolean;

  private isDim: boolean;

  private name: string;

  private value: string;

  public toDsl() {
    let result = '';
    if (this.key) result += 'key ';
    if (this.isDim) result += 'dim ';

    return `${result}[${this.name}]=${this.value}`;
  }

  constructor(name: string, value: string, isKey = false, isDim = false) {
    this.key = isKey;
    this.isDim = isDim;
    this.name = name;
    this.value = value;
  }

  public getName() {
    return this.name;
  }

  public getValue() {
    return this.value;
  }

  public setKey(isKey: boolean) {
    this.key = isKey;
  }

  public makeKey() {
    this.key = true;
  }

  public removeKey() {
    this.key = false;
  }

  public isKey() {
    return this.key;
  }

  public setIsDim(isDim: boolean) {
    this.isDim = isDim;
  }

  public makeDim() {
    this.isDim = true;
  }

  public removeDim() {
    this.isDim = false;
  }

  public updateName(newName: string) {
    this.name = newName;
  }

  public updateValue(newValue: string) {
    this.value = newValue;
  }
}
