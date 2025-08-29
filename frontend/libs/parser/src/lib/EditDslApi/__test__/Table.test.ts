import { Decorator } from '../Decorator';
import { Field, FieldGroup } from '../Field';
import { Table } from '../Table';
import { createEditableTestSheet } from './utils';

describe('Table', () => {
  it('should not delete text with fields', () => {
    // Arrange
    const dsl = 'table A\n  # comment 1\n  [a] = 1\n  # comment 2\n  [b] = 2\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    table.fieldGroups.deleteItem(0);
    table.fieldGroups.deleteItem(0);

    // Assert
    expect(sheet.toDSL()).toEqual('table A\n  # comment 1\n  # comment 2\n');
  });

  it('should add a new field after removing the original one', () => {
    // Arrange
    const dsl = 'table A\n  # comment 1\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    table.fieldGroups.deleteItem(0);
    table.fieldGroups.append(FieldGroup.fromField(new Field('b'), '2'));

    // Assert
    expect(sheet.toDSL()).toEqual('table A\n  # comment 1\n  [b] = 2\n');
  });

  it('should rename a table', () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    table.name = 'B';

    // Assert
    expect(sheet.getTable('B')).toBeDefined();
    expect(sheet.toDSL()).toEqual('table B\n  [a] = 1\n');
  });

  it('should rename a table with escaped name', () => {
    // Arrange
    const dsl = "table 'A '''\n  [a] = 1\n";
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable(`A '`);
    table.name = "'New table'";

    // Assert
    expect(sheet.toDSL()).toEqual("table 'New table'\n  [a] = 1\n");
  });

  it('should add a new table', () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const newTable = new Table('New table');
    newTable.fieldGroups.append(FieldGroup.fromField(new Field('b'), '2'));
    sheet.addTable(newTable);

    // Assert
    expect(sheet.getTable('New table')).toBe(newTable);
    expect(sheet.toDSL()).toEqual(
      "table A\n  [a] = 1\ntable 'New table'\n  [b] = 2\n"
    );
  });

  it('should remove a table', () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    sheet.removeTable('A');

    // Assert
    expect(sheet.toDSL()).toEqual('');
  });

  it('should rename table decorator', () => {
    // Arrange
    const dsl = '!old_name(1) table A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const decorator = table.getDecorator('old_name');
    decorator.name = 'new_name';

    // Assert
    expect(decorator.name).toBe('new_name');
    expect([...table.decoratorNames]).toEqual(['new_name']);
    expect(sheet.toDSL()).toEqual('!new_name(1) table A\n  [a] = 1\n');
  });

  it('should add table decorator', () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const decorator = new Decorator('decorator_name', '(1)');
    table.addDecorator(decorator);

    // Assert
    expect([...table.decoratorNames]).toEqual(['decorator_name']);
    expect(table.getDecorator('decorator_name')).toBe(decorator);
    expect(sheet.toDSL()).toEqual('!decorator_name(1)\ntable A\n  [a] = 1\n');
  });

  it('should remove table decorator', () => {
    // Arrange
    const dsl = '!decorator_name(1) table A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    table.removeDecorator('decorator_name');

    // Assert
    expect([...table.decoratorNames]).toEqual([]);
    expect(sheet.toDSL()).toEqual('table A\n  [a] = 1\n');
  });

  it('should add table decorator', () => {
    // Arrange
    const dsl = '!decorator()\ntable A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');

    // Assert
    expect(table.hasDecorator('decorator')).toBe(true);
    expect(table.hasDecorator('missing')).toBe(false);
  });
});
