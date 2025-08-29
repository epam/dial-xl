import { Decorator } from '../Decorator';
import { Field, FieldGroup } from '../Field';
import { createEditableTestSheet } from './utils';

describe('Field', () => {
  it('should rename a field', () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    const field = group.getField('a');
    field.name = 'renamed a';

    // Assert
    expect(sheet.toDSL()).toBe('table A\n  [renamed a] = 1\n');
  });

  it('should rename a field with escaped name', () => {
    // Arrange
    const dsl = "table A\n  [a']'[] = 1\n";
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    const field = group.getField('a][');
    field.name = '[renamed a]';

    // Assert
    expect(field.name).toBe(`renamed a`);
    expect(Array.from(group.fieldNames)).toEqual(['renamed a']);
    expect(sheet.toDSL()).toBe('table A\n  [renamed a] = 1\n');
  });

  it('should add a new field', () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const newField = new Field('b');
    const group = FieldGroup.fromField(newField, '2');
    table.fieldGroups.append(group);

    // Assert
    expect(table.fieldGroups.length).toBe(2);
    expect(group.getField('b')).toBe(newField);
    expect(sheet.toDSL()).toBe('table A\n  [a] = 1\n  [b] = 2\n');
  });

  it('should remove a field', () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n  [b] = 2\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    table.fieldGroups.deleteItem(1);

    // Assert
    expect(table.fieldGroups.length).toBe(1);
    expect(sheet.toDSL()).toBe('table A\n  [a] = 1\n');
  });

  it('should preserve field modifiers (key/dim)', () => {
    // Arrange
    const dsl = 'table A\n  key dim [a] = RANGE(1)\n  dim key [b] = RANGE(1)\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const groupA = table.fieldGroups.getItem(0);
    const groupB = table.fieldGroups.getItem(1);

    // Assert
    const a = groupA.getField('a');
    const b = groupB.getField('b');
    expect(a.key).toBe(true);
    expect(a.dim).toBe(true);
    expect(b.key).toBe(true);
    expect(b.dim).toBe(true);
  });

  it('should rename a field decorator', () => {
    // Arrange
    const dsl = 'table A\n  !old_name(1) [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    const field = group.getField('a');
    const decorator = field.getDecorator('old_name');
    decorator.name = 'new_name';

    // Assert
    expect(decorator.name).toBe('new_name');
    expect(Array.from(field.decoratorNames)).toEqual(['new_name']);
  });

  it('should add a field decorator', () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    const field = group.getField('a');
    const decorator = new Decorator('decorator_name', '(1)');
    field.addDecorator(decorator);

    // Assert
    expect(field.getDecorator('decorator_name')).toBe(decorator);
    expect(sheet.toDSL()).toBe('table A\n  !decorator_name(1)\n  [a] = 1\n');
  });

  it('should remove a field decorator', () => {
    // Arrange
    const dsl = 'table A\n  !decorator_name(1) [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    const field = group.getField('a');
    field.removeDecorator('decorator_name');

    // Assert
    expect(Array.from(field.decoratorNames)).toEqual([]);
    expect(sheet.toDSL()).toEqual('table A\n  [a] = 1\n');
  });

  it('should set key on a field', () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    const field = group.getField('a');
    field.key = true;

    // Assert
    expect(field.key).toBe(true);
    expect(sheet.toDSL()).toBe('table A\n  key [a] = 1\n');
  });

  it('should set dim on a field', () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    const field = group.getField('a');
    field.dim = true;

    // Assert
    expect(field.dim).toBe(true);
    expect(sheet.toDSL()).toEqual('table A\n  dim [a] = 1\n');
  });

  it('should unset key on a field', () => {
    // Arrange
    const dsl = 'table A\n  key [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    const field = group.getField('a');
    field.key = false;

    // Assert
    expect(field.key).toBe(false);
    expect(sheet.toDSL()).toEqual('table A\n  [a] = 1\n');
  });

  it('should unset dim on a field', () => {
    // Arrange
    const dsl = 'table A\n  dim [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    const field = group.getField('a');
    field.dim = false;

    // Assert
    expect(field.dim).toBe(false);
    expect(sheet.toDSL()).toEqual('table A\n  [a] = 1\n');
  });

  it('should handle fields with and without formulas', () => {
    // Arrange
    const dsl = 'table A\n  [a]\n  [b]\n  [c] = 3\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const groupB = table.fieldGroups.getItem(1);
    const groupC = table.fieldGroups.getItem(2);
    groupB.formula = '2';
    groupC.formula = null;

    // Assert
    expect(sheet.toDSL()).toEqual('table A\n  [a]\n  [b] = 2\n  [c]\n');
  });

  it('should rename multi field', () => {
    // Arrange
    const dsl = 'table A\n  [a], [b] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    const fieldA = group.getField('a');
    fieldA.name = 'c';

    // Assert
    expect(sheet.toDSL()).toBe('table A\n  [c], [b] = 1\n');
  });

  it('should remove multi field', () => {
    // Arrange
    const dsl = 'table A\n  [a], [b] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    group.removeField('a');

    // Assert
    expect(sheet.toDSL()).toBe('table A\n  [b] = 1\n');
  });

  it('should set multi field modifiers', () => {
    // Arrange
    const dsl = 'table A\n  [a],\n  [b] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    const fieldA = group.getField('a');
    const fieldB = group.getField('b');
    fieldA.dim = true;
    fieldA.key = true;
    fieldB.key = true;

    // Assert
    expect(sheet.toDSL()).toBe('table A\n  dim key [a],\n  key [b] = 1\n');
  });

  it('should unset multi field modifiers', () => {
    // Arrange
    const dsl = 'table A\n  dim key [a],\n  key [b] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    const fieldA = group.getField('a');
    const fieldB = group.getField('b');
    fieldA.dim = false;
    fieldA.key = false;
    fieldB.key = false;

    // Assert
    expect(sheet.toDSL()).toBe('table A\n  [a],\n  [b] = 1\n');
  });

  it('should add multi field decorators', () => {
    // Arrange
    const dsl = 'table A\n  [a], [b] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    const fieldA = group.getField('a');
    const fieldB = group.getField('b');
    fieldA.addDecorator(new Decorator('size', '(1)'));
    fieldB.addDecorator(new Decorator('size', '(2)'));
    // Assert
    expect(fieldA.hasDecorator('size')).toBe(true);
    expect(fieldB.hasDecorator('size')).toBe(true);
    expect(sheet.toDSL()).toBe(
      'table A\n  !size(1)\n  [a], !size(2)\n  [b] = 1\n'
    );
  });

  it('should remove multi field decorators', () => {
    // Arrange
    const dsl = 'table A\n  !size(1)\n  [a], !size(2)\n  [b] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    const fieldA = group.getField('a');
    const fieldB = group.getField('b');
    fieldA.removeDecorator('size');
    fieldB.removeDecorator('size');

    // Assert
    expect(sheet.toDSL()).toBe('table A\n  [a], [b] = 1\n');
  });

  it('should check if a field has a decorator', () => {
    // Arrange
    const dsl = 'table A\n  !decorator() [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    const field = group.getField('a');

    // Assert
    expect(field.hasDecorator('decorator')).toBe(true);
    expect(field.hasDecorator('missing')).toBe(false);
  });

  it('should insert field decorators at specific indices', () => {
    // Arrange
    const dsl = 'table A\n  !size(2) [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    const field = group.getField('a');

    const decorator1 = new Decorator('decorator1', '(1)');
    field.insertDecorator(0, decorator1);

    const decorator2 = new Decorator('decorator2', '(2)');
    field.insertDecorator(1, decorator2);

    // Assert
    expect(Array.from(field.decoratorNames)).toEqual([
      'decorator1',
      'decorator2',
      'size',
    ]);
    expect(field.getDecorator('decorator1')).toBe(decorator1);
    expect(field.getDecorator('decorator2')).toBe(decorator2);

    const expected =
      'table A\n  !decorator1(1)\n  !decorator2(2)\n  !size(2) [a] = 1\n';
    expect(sheet.toDSL()).toBe(expected);
  });
});
