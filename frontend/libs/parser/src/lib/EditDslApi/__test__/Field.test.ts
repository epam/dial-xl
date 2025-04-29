import { Decorator } from '../Decorator';
import { Field } from '../Field';
import { createEditableTestSheet } from './utils';

describe('Field', () => {
  it('should rename a field', () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const field = table.getField('a');
    field.name = 'renamed a';

    // Assert
    expect(sheet.toDSL()).toBe('table A\n  [renamed a] = 1\n');
  });

  it('should rename a field with escaped name', async () => {
    // Arrange
    const dsl = "table A\n  [a']'[] = 1\n";
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const field = table.getField(`a][`);
    field.name = '[renamed a]';

    // Assert
    expect(field.name).toBe(`renamed a`);
    expect(table.getField(`[renamed a]`)).toBe(field);
    expect(sheet.toDSL()).toBe('table A\n  [renamed a] = 1\n');
  });

  it('should add a new field', () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const field = new Field('b', '2');
    table.addField(field);

    // Assert
    expect(table.getField('b')).toBe(field);
    expect(sheet.toDSL()).toBe('table A\n  [a] = 1\n  [b] = 2\n');
  });

  it('should remove a field', () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n  [b] = 2\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    table.removeField('b');

    // Assert
    expect(sheet.toDSL()).toBe('table A\n  [a] = 1\n');
  });

  it('should update a field formula', () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const field = table.getField('a');
    field.formula = '2';

    // Assert
    expect(sheet.toDSL()).toBe('table A\n  [a] = 2\n');
  });

  it('should preserve field modifiers (key/dim)', () => {
    // Arrange
    const dsl = 'table A\n  key dim [a] = RANGE(1)\n  dim key [b] = RANGE(1)\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const a = table.getField('a');
    const b = table.getField('b');

    // Assert
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
    const field = sheet.getTable('A').getField('a');
    const decorator = field.getDecorator('old_name');
    decorator.name = 'new_name';

    // Assert
    expect(field.getDecorator('new_name')).toBeDefined();
    expect(decorator.name).toBe('new_name');
  });

  it('should add a field decorator', () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const field = sheet.getTable('A').getField('a');
    const decorator = new Decorator('decorator_name', '(1)');
    field.addDecorator(decorator);

    // Assert
    expect(field.getDecorator('decorator_name')).toBe(decorator);
    expect(sheet.toDSL()).toBe('table A\n  !decorator_name(1)\n  [a] = 1\n');
  });

  it('should remove a field decorator', async () => {
    // Arrange
    const dsl = 'table A\n  !decorator_name(1) [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const field = sheet.getTable('A').getField('a');
    field.removeDecorator('decorator_name');

    // Assert
    expect(sheet.toDSL()).toEqual('table A\n  [a] = 1\n');
  });

  it('should set key on a field', async () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const field = table.getField('a');
    field.key = true;

    // Assert
    expect(field.key).toBe(true);
    expect(sheet.toDSL()).toEqual('table A\n  key [a] = 1\n');
  });

  it('should set dim on a field', async () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const field = table.getField('a');
    field.dim = true;

    // Assert
    expect(field.dim).toBe(true);
    expect(sheet.toDSL()).toEqual('table A\n  dim [a] = 1\n');
  });

  it('should unset key on a field', async () => {
    // Arrange
    const dsl = 'table A\n  key [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const field = table.getField('a');
    field.key = false;

    // Assert
    expect(field.key).toBe(false);
    expect(sheet.toDSL()).toEqual('table A\n  [a] = 1\n');
  });

  it('should unset dim on a field', async () => {
    // Arrange
    const dsl = 'table A\n  dim [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const field = table.getField('a');
    field.dim = false;

    // Assert
    expect(field.dim).toBe(false);
    expect(sheet.toDSL()).toEqual('table A\n  [a] = 1\n');
  });

  it('should handle fields with and without formulas', async () => {
    // Arrange
    const dsl = 'table A\n  [a]\n  [b]\n  [c] = 3\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    table.getField('b').formula = '2';
    table.getField('c').formula = null; // or undefined, depending on your code

    // Assert
    expect(sheet.toDSL()).toEqual('table A\n  [a]\n  [b] = 2\n  [c]\n');
  });
});
