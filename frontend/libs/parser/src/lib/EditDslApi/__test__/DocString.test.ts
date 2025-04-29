import { createEditableTestSheet } from './utils';

describe('Doc String Tests', () => {
  it('should parse and retrieve doc strings from table and field', async () => {
    // Arrange
    const dsl = [
      '## table doc line 1\n',
      '## table doc line 2\n',
      'table A\n',
      '  ## field doc line 1\n',
      '  ## field doc line 2\n',
      '  [a] = 1\n',
    ].join('');

    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const field = table.getField('a');

    // Assert
    expect(table.docString).toBe(' table doc line 1\n table doc line 2');
    expect(field.docString).toBe(' field doc line 1\n field doc line 2');
  });

  it('should set doc strings on a table and field', async () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const field = table.getField('a');

    table.docString = ' table doc line 1\n table doc line 2';
    field.docString = ' field doc line 1\n field doc line 2';

    // Assert
    expect(sheet.toDSL()).toBe(
      [
        '## table doc line 1\n',
        '## table doc line 2\n',
        'table A\n',
        '  ## field doc line 1\n',
        '  ## field doc line 2\n',
        '  [a] = 1\n',
      ].join('')
    );
  });

  it('should update existing doc strings with new lines', async () => {
    // Arrange
    const dsl = [
      '## table doc line 1\r\n',
      '## table doc line 2\r\n',
      'table A\n',
      '  ## field doc line 1\r\n',
      '  ## field doc line 2\r\n',
      '  [a] = 1\n',
    ].join('');
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const field = table.getField('a');

    table.docString = ' table doc line 1\n table doc line 2\n table doc line 3';
    field.docString = ' field doc line 1\n field doc line 2\n field doc line 3';

    // Assert
    expect(sheet.toDSL()).toBe(
      [
        '## table doc line 1\n',
        '## table doc line 2\n',
        '## table doc line 3\n',
        'table A\n',
        '  ## field doc line 1\n',
        '  ## field doc line 2\n',
        '  ## field doc line 3\n',
        '  [a] = 1\n',
      ].join('')
    );
  });

  it('should remove doc strings if set to null/none', async () => {
    // Arrange
    const dsl = [
      '## table doc line 1\n',
      '## table doc line 2\n',
      'table A\n',
      '  ## field doc line 1\n',
      '  ## field doc line 2\n',
      '  [a] = 1\n',
    ].join('');
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const field = table.getField('a');

    table.docString = null;
    field.docString = null;

    // Assert
    expect(sheet.toDSL()).toBe('table A\n  [a] = 1\n');
  });
});
