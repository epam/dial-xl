import { GridMenuItems } from '../enums/GridMenuItems';
import { Orientation } from '../enums/Orientation';
import { Field } from './Field';
import { Override } from './Override';

export class Table {
  private top: number;

  private left: number;

  private name: string;

  private isDynamic: boolean;

  private isManual: boolean;

  private isTableHeaderHidden: boolean;

  private isFieldHeaderHidden: boolean;

  private isHorizontal: boolean;

  private menu: GridMenuItems;

  public width() {
    return this.fields.length;
  }

  public height() {
    if (this.isDynamic) {
      return undefined;
    }
    const base = 2;
    if (this.isManual) return base + this.overrides[0].getSize();
    else return base + 1;
  }

  public getTop() {
    return this.top;
  }

  public getLeft() {
    return this.left;
  }
  public getName() {
    return this.name;
  }
  public getMenu() {
    return this.menu;
  }

  constructor(top: number, left: number, name: string) {
    this.top = top;
    this.left = left;
    this.name = name;
    this.fields = new Array<Field>(0);
    this.overrides = new Array<Override>(0);
    this.menu = new GridMenuItems(Orientation.Vertical);
  }

  public makeManual() {
    this.isManual = true;
  }

  public makeDynamic() {
    this.isDynamic = true;
  }

  public hideHeader() {
    this.isTableHeaderHidden = true;
  }

  public hideFieldHeader() {
    this.isFieldHeaderHidden = true;
  }

  public showHeader() {
    this.isTableHeaderHidden = false;
  }

  public showFieldHeader() {
    this.isFieldHeaderHidden = false;
  }

  public makeHorizontal() {
    this.isHorizontal = true;
    this.menu = new GridMenuItems(Orientation.Horizontal);
  }

  public makeVertical() {
    this.isHorizontal = false;
    this.menu = new GridMenuItems(Orientation.Vertical);
  }

  private fields: Array<Field>;

  private overrides: Array<Override>;

  public toDsl() {
    let dsl = `!layout(${this.top},${this.left}`;
    if (!this.isFieldHeaderHidden) {
      dsl += `, "headers"`;
    }
    if (!this.isTableHeaderHidden) {
      dsl += `, "title"`;
    }
    if (this.isHorizontal) {
      dsl += `, "horizontal"`;
    }
    if (this.isManual) {
      dsl = `!manual()\n${dsl}`;
    }
    dsl += `)\ntable ${this.name}\n`;
    for (const field of this.fields) {
      dsl += field.toDsl() + '\n';
    }
    if (this.overrides.length > 0) {
      dsl += 'override\n';
      if (!this.isManual) dsl += 'row,';
      for (const over of this.overrides) {
        dsl += `[${over.getName()}],`;
      }
      dsl = dsl.slice(0, -1) + '\n';
      let max = this.overrides[0].getMaxKey();
      let dslSection = '';
      for (let i = 1; i < this.overrides.length; i++)
        if (this.overrides[i].getMaxKey() > max)
          max = this.overrides[i].getMaxKey();
      for (let i = 0; i <= max; i++) {
        for (const over of this.overrides) {
          if (over.getValue(i)) dslSection += over.getValue(i);
          dslSection += ',';
        }
        if (dslSection.length > (dslSection.match(/,/g) || []).length) {
          if (!this.isManual) dslSection = `${i},${dslSection}`;
          dsl += dslSection.slice(0, -1) + '\n';
        }
        dslSection = '';
      }
    }

    return dsl;
  }

  public updatePlacement(top: number, left: number) {
    this.top = top;
    this.left = left;
  }

  public updateName(newName: string) {
    this.name = newName;
  }

  public removeField(name: string) {
    const indToRemove = this.fields.findIndex(
      (item) => item.getName() === name
    );
    this.fields.splice(indToRemove, 1);
  }

  public addField(field: Field) {
    this.fields.push(field);
  }

  public swapFields(index1: number, index2: number) {
    const t = this.fields[index1];
    this.fields[index1] = this.fields[index2];
    this.fields[index2] = t;
  }

  public getField(ind: number) {
    return this.fields[ind];
  }

  public getFieldByName(name: string) {
    const ind = this.fields.findIndex((item) => item.getName() === name);

    return this.getField(ind);
  }

  public createOverride(name: string, values: Map<number, string>) {
    this.overrides.push(new Override(name, values));
  }

  public addOverrideValue(name: string, row: number, value: string) {
    let over = this.overrides.find((item) => item.getName() === name);
    if (!over) {
      this.createOverride(name, new Map<number, string>());
      over = this.overrides.find((item) => item.getName() === name);
    }
    over?.updateValue(row, value);
  }

  public removeOverride(name: string) {
    const indToRemove = this.overrides.findIndex(
      (item) => item.getName() === name
    );
    this.overrides.splice(indToRemove, 1);
  }

  public removeOverrideValue(name: string, row: number) {
    const override = this.overrides.find((item) => item.getName() === name);
    override?.removeValue(row);
    if (override?.getSize() === 0) this.removeOverride(name);
  }

  public getOverrideValue(name: string, row: number) {
    const result = this.overrides
      .find((item) => item.getName() === name)
      ?.getValue(row);
    if (!result) return '';

    return result;
  }

  public getFirstCellCoord() {
    let verticalShift = 2;
    if (this.isTableHeaderHidden) verticalShift--;
    if (this.isFieldHeaderHidden) verticalShift--;

    return this.getTop() + verticalShift;
  }

  public getFieldHeadersRow() {
    let verticalShift = 1;
    if (this.isTableHeaderHidden) verticalShift--;

    return this.getTop() + verticalShift;
  }

  public get;
}
