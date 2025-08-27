import { Field, FieldGroup } from '../Field';
import { createEditableTestSheet } from './utils';

describe('FieldGroup', () => {
  it('should handle field groups', () => {
    // Arrange
    const dsl = 'table A\n  [a], [b] = 1\n  [c] = 2\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group1 = table.fieldGroups.getItem(0);
    const group2 = table.fieldGroups.getItem(1);

    // Assert
    expect(table.fieldGroups.length).toBe(2);
    expect(group1.fieldCount).toBe(2);
    expect(Array.from(group1.fieldNames)).toEqual(['a', 'b']);
    expect(group2.fieldCount).toBe(1);
    expect(Array.from(group2.fieldNames)).toEqual(['c']);
    expect(sheet.toDSL()).toBe(dsl);
  });

  it('should add field', () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    group.addField(new Field('b'));

    // Assert
    expect(group.hasField('b')).toBe(true);
    expect(sheet.toDSL()).toBe('table A\n  [a], [b] = 1\n');
  });

  it('should remove field', () => {
    // Arrange
    const dsl = 'table A\n  [a], [b] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    const field = group.removeField('b');

    // Assert
    expect(field.name).toBe('b');
    expect(sheet.toDSL()).toBe('table A\n  [a] = 1\n');
  });

  it('should remove field in the middle of the group', () => {
    // Arrange
    const dsl = 'table A\n  [a], [b], [c] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    const field = group.removeField('b');

    // Assert
    expect(field.name).toBe('b');
    expect(sheet.toDSL()).toBe('table A\n  [a], [c] = 1\n');
  });

  it('should update field', () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    const field = group.getField('a');
    field.dim = true;
    field.name = 'b';

    // Assert
    expect(sheet.toDSL()).toBe('table A\n  dim [b] = 1\n');
  });

  it('should update group formula', () => {
    // Arrange
    const dsl = 'table A\n  [a], [b] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    group.formula = '2';

    // Assert
    expect(sheet.toDSL()).toBe('table A\n  [a], [b] = 2\n');
  });

  it('should check if a field exists in a group', () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);

    // Assert
    expect(group.hasField('a')).toBe(true);
    expect(group.hasField('missing')).toBe(false);
  });

  it('should insert fields within a group', () => {
    // Arrange
    const dsl = 'table A\n  [c] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const group = table.fieldGroups.getItem(0);
    group.insertField(0, new Field('a'));
    group.insertField(1, new Field('b'));

    // Assert
    expect(group.hasField('a')).toBe(true);
    expect(group.hasField('b')).toBe(true);
    expect(Array.from(group.fieldNames)).toEqual(['a', 'b', 'c']);
    expect(sheet.toDSL()).toBe('table A\n  [a], [b], [c] = 1\n');
  });

  it('should insert field groups in a table', () => {
    // Arrange
    const dsl = 'table A\n  [c] = 3\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const groups = table.fieldGroups;
    groups.insert(0, FieldGroup.fromField(new Field('a'), '1'));
    groups.insert(1, FieldGroup.fromField(new Field('b'), '2'));

    // Assert
    expect(groups.length).toBe(3);
    expect(sheet.toDSL()).toBe('table A\n  [a] = 1\n  [b] = 2\n  [c] = 3\n');
  });
});
