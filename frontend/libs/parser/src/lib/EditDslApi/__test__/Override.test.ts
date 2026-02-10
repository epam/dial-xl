import { Override, Overrides } from '../Override';
import { createEditableTestSheet } from './utils';

describe('Override', () => {
  it('should parse override block and verify structure', () => {
    // Arrange
    const dsl = [
      'table A\n',
      '  [a] = NA\n',
      '  [b] = NA\n',
      'override\n',
      'row,[a],[b]\n',
      '1,2,3\n',
      '4,5,6\n',
    ].join('');
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const overrides = table.overrides;

    // Assert
    expect(overrides).toBeInstanceOf(Overrides);
    expect(overrides?.fieldNames).toEqual(['a', 'b']);
    expect(overrides?.rowPosition).toBe(0);

    // The first row
    const row0 = overrides?.getItem(0);
    expect(row0?.rowNumber).toBe('1');
    expect(row0?.getItem('a')).toBe('2');
    expect(row0?.getItem('b')).toBe('3');

    // The second row
    const row1 = overrides?.getItem(1);
    expect(row1?.rowNumber).toBe('4');
    expect(row1?.getItem('a')).toBe('5');
    expect(row1?.getItem('b')).toBe('6');
  });

  it('should add an override block to a table', () => {
    // Arrange
    const dsl = 'table A\n  [a] = NA\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const overrides = new Overrides();
    overrides.append(new Override({ a: '1' }));
    table.overrides = overrides;

    // Assert
    expect(overrides.fieldNames).toEqual(['a']);
    expect(overrides.length).toBe(1);
    expect(sheet.toDSL()).toBe('table A\n  [a] = NA\noverride\n[a]\n1\n');
  });

  it('should add an override cell to an existing line', () => {
    // Arrange
    const dsl = [
      'table A\n',
      '  [a] = NA\n',
      '  [b] = NA\n',
      'override\n',
      '[a]\n',
      '1\n',
    ].join('');
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const overrides = table.overrides;
    overrides?.getItem(0).setItem('b', '2');

    // Assert
    expect(overrides?.fieldNames).toEqual(['a', 'b']);
    expect(overrides?.length).toBe(1);
    expect(sheet.toDSL()).toBe(
      'table A\n  [a] = NA\n  [b] = NA\noverride\n[a],[b]\n1,2\n'
    );
  });

  it('should add a new override line', () => {
    // Arrange
    const dsl = ['table A\n  [a] = NA\n  [b] = NA\noverride\n[a]\n1\n'].join(
      ''
    );
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const overrides = table.overrides;
    overrides?.append(new Override({ b: '2' }));

    // Assert
    expect(overrides?.fieldNames).toEqual(['a', 'b']);
    expect(overrides?.length).toBe(2);
    expect(sheet.toDSL()).toBe(
      'table A\n  [a] = NA\n  [b] = NA\noverride\n[a],[b]\n1,\n,2\n'
    );
  });

  it('should update an existing override cell value', () => {
    // Arrange
    const dsl = 'table A\n  [a] = NA\noverride\n[a]\n1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const overrides = table.overrides;
    overrides?.getItem(0).setItem('a', '2');

    // Assert
    expect(overrides?.fieldNames).toEqual(['a']);
    expect(overrides?.length).toBe(1);
    expect(sheet.toDSL()).toBe('table A\n  [a] = NA\noverride\n[a]\n2\n');
  });

  it('should remove an override cell', () => {
    // Arrange
    const dsl = [
      'table A\n  [a] = NA\n  [b] = NA\noverride\n[a],[b]\n1,2\n',
    ].join('');
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const overrides = table.overrides;
    overrides?.getItem(0).deleteItem('b');

    // Assert
    expect(overrides?.fieldNames).toEqual(['a']);
    expect(overrides?.length).toBe(1);
    expect(sheet.toDSL()).toBe(
      'table A\n  [a] = NA\n  [b] = NA\noverride\n[a]\n1\n'
    );
  });

  it('should add a row number to an override line', () => {
    // Arrange
    const dsl = 'table A\n  [a] = NA\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const overrides = new Overrides();
    const override = new Override();
    override.rowNumber = '1';
    override.setItem('a', '2');
    overrides.append(override);
    table.overrides = overrides;

    // Assert
    expect(overrides.fieldNames).toEqual(['a']);
    expect(overrides.rowPosition).toBe(0);
    expect(sheet.toDSL()).toBe('table A\n  [a] = NA\noverride\nrow,[a]\n1,2\n');
  });

  it('should add a row number to an existing override line', () => {
    // Arrange
    const dsl = 'table A\n  [a] = NA\noverride\n[a]\n2\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const overrides = table.overrides;
    const item = overrides?.getItem(0);
    item!.rowNumber = '1';

    // Assert
    expect(overrides?.fieldNames).toEqual(['a']);
    expect(overrides?.rowPosition).toBe(1);
    expect(sheet.toDSL()).toBe('table A\n  [a] = NA\noverride\n[a],row\n2,1\n');
  });

  it('should remove a row number from an override line', () => {
    // Arrange
    const dsl = [
      'table A\n  [a] = NA\n  [b] = NA\noverride\n[a],row\n1,2\n',
    ].join('');
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const overrides = table.overrides;
    const item = overrides?.getItem(0);
    item!.rowNumber = null;

    // Assert
    expect(overrides?.fieldNames).toEqual(['a']);
    expect(overrides?.length).toBe(1);
    expect(sheet.toDSL()).toBe(
      'table A\n  [a] = NA\n  [b] = NA\noverride\n[a]\n1\n'
    );
  });

  it('should update an entire override line', () => {
    // Arrange
    const dsl = 'table A\n  [a] = NA\noverride\n[a]\n1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const overrides = table.overrides;
    overrides?.setItem(0, new Override({ a: '2' }));

    // Assert
    expect(sheet.toDSL()).toBe('table A\n  [a] = NA\noverride\n[a]\n2\n');
  });

  it('should remove an entire override line', () => {
    // Arrange
    const dsl = 'table A\n  [a] = NA\noverride\n[a]\n1\n2\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const overrides = table.overrides;
    overrides?.deleteItem(1);

    // Assert
    expect(sheet.toDSL()).toBe('table A\n  [a] = NA\noverride\n[a]\n1\n');
  });

  it('should rename override field', () => {
    // Arrange
    const dsl = 'table A\n  [a] = NA\noverride\n[a]\n1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const field = table.fieldGroups.getItem(0).getField('a');
    field.name = 'renamed a';
    table.overrides?.renameField('a', 'renamed a');

    // Assert
    expect(sheet.toDSL()).toBe(
      'table A\n  [renamed a] = NA\noverride\n[renamed a]\n1\n'
    );
  });

  it('should insert a new override line', () => {
    // Arrange
    const dsl = 'table A\n  [a] = NA\noverride\n[a]\n3\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const overrides = table.overrides!;
    overrides.insert(0, new Override({ a: '1' }));
    overrides.insert(1, new Override({ a: '2' }));

    // Assert
    expect(overrides.length).toBe(3);
    expect(sheet.toDSL()).toBe('table A\n  [a] = NA\noverride\n[a]\n1\n2\n3\n');
  });
});
