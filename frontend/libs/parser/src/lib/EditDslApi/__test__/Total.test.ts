import { Field } from '../Field';
import { Total } from '../Total';
import { createEditableTestSheet } from './utils';

describe('Totals', () => {
  it('should add total', async () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n  [b] = 2\n';
    const sheet = await createEditableTestSheet(dsl);

    // Act
    const total1 = new Total();
    total1.addField(new Field('a', 'A[a].SUM()'));
    const total2 = new Total();
    total2.addField(new Field('b', 'A[b].COUNT()'));

    const table = sheet.getTable('A');
    table.addTotal(total1);
    table.addTotal(total2);

    // Assert
    expect(table.totalCount).toBe(2);
    expect(Array.from(table.getTotal(1).fieldNames)).toEqual(['a']);
    expect(Array.from(table.getTotal(2).fieldNames)).toEqual(['b']);
    expect(sheet.toDSL()).toEqual(
      'table A\n  [a] = 1\n  [b] = 2\ntotal\n  [a] = A[a].SUM()\ntotal\n  [b] = A[b].COUNT()\n'
    );
  });

  it('should edit total', async () => {
    // Arrange
    const dsl =
      'table A\n  [a] = 1\n  [b] = 2\ntotal\n  [a] = A[a].SUM()\n  [b] = A[b].SUM()\n' +
      'total\n  [b] = A[b].COUNT()\n';
    const sheet = await createEditableTestSheet(dsl);
    const table = sheet.getTable('A');

    // Act
    const total1 = table.getTotal(1);
    total1.removeField('b');
    total1.getField('a').formula = 'A[a].COUNT()';

    const total2 = table.getTotal(2);
    total2.addField(new Field('a', 'A[a].SUM()'));
    total2.getField('b').formula = 'A[b].SUM()';

    // Assert
    expect(sheet.toDSL()).toEqual(
      'table A\n  [a] = 1\n  [b] = 2\ntotal\n  [a] = A[a].COUNT()\ntotal\n  [b] = A[b].SUM()\n  [a] = A[a].SUM()\n'
    );
  });

  it('should remove total', async () => {
    // Arrange
    const dsl =
      'table A\n  [a] = 1\n  [b] = 2\ntotal\n  [a] = A[a].SUM()\n  [b] = A[b].SUM()\n' +
      'total\n  [b] = A[b].COUNT()\n';
    const sheet = await createEditableTestSheet(dsl);
    const table = sheet.getTable('A');

    // Act
    table.removeTotal(1);
    table.removeTotal(1);

    // Assert
    expect(sheet.toDSL()).toEqual('table A\n  [a] = 1\n  [b] = 2\n');
  });

  it('should remove total and clean up total rows', async () => {
    // Arrange
    const dsl =
      'table A\n  [a] = 1\n  [b] = 2\ntotal\n  [a] = A[a].SUM()\n  [b] = A[b].SUM()\ntotal\n  [a] = A[a].COUNT()\n  [b] = A[b].COUNT()\n';
    const sheet = await createEditableTestSheet(dsl);
    const table = sheet.getTable('A');

    // Act
    const total = table.getTotal(2);
    total.removeField('b');
    total.removeField('a');
    table.cleanUpTotals();

    // Assert
    expect(sheet.toDSL()).toEqual(
      'table A\n  [a] = 1\n  [b] = 2\ntotal\n  [a] = A[a].SUM()\n  [b] = A[b].SUM()\n'
    );
  });

  it('should not break apply after removing total', async () => {
    // Arrange
    const dsl =
      'table A\n  [a] = 1\ntotal\n  [a] = A[a].SUM()\napply\nsort A[a]\n';
    const sheet = await createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const oldApply = table.apply;

    table.removeTotal(1);

    // Assert
    expect(table.apply).toBe(oldApply);
    expect(sheet.toDSL()).toEqual('table A\n  [a] = 1\napply\nsort A[a]\n');
  });
});
