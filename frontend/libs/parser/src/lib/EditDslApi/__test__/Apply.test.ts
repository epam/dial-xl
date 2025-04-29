import { Apply, ApplyFilter, ApplySort } from '../Apply';
import { createEditableTestSheet } from './utils';

describe('Apply', () => {
  it('should add apply', async () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n  [b] = 2\n';
    const sheet = await createEditableTestSheet(dsl);

    const apply = new Apply();
    const sort = new ApplySort();
    sort.append('-A[a]');
    sort.append('A[b]');
    apply.sort = sort;
    apply.filter = new ApplyFilter('A[b] = 2');

    const table = sheet.getTable('A');

    // Act
    table.apply = apply;

    // Assert
    expect(apply.filter?.formula).toBe('A[b] = 2');
    expect(apply.sort?.length).toBe(2);
    expect(apply.sort?.getItem(0)).toBe('-A[a]');
    expect(apply.sort?.getItem(1)).toBe('A[b]');
    expect(sheet.toDSL()).toEqual(
      'table A\n  [a] = 1\n  [b] = 2\napply\nsort -A[a], A[b]\nfilter A[b] = 2\n'
    );
  });

  it('should edit apply', async () => {
    // Arrange
    const dsl =
      'table A\n  [a] = 1\n  [b] = 2\napply\nsort -A[a], A[b]\nfilter A[b] = 2\n';
    const sheet = await createEditableTestSheet(dsl);
    const table = sheet.getTable('A');
    const apply = table.apply!;

    // Act
    apply.sort?.setItem(0, 'A[a]');
    apply.sort?.deleteItem(1);
    if (apply.filter) {
      apply.filter.formula = 'A[a] = 1';
    }

    // Assert
    expect(sheet.toDSL()).toEqual(
      'table A\n  [a] = 1\n  [b] = 2\napply\nsort A[a]\nfilter A[a] = 1\n'
    );
  });

  it('should remove sort from apply', async () => {
    // Arrange
    const dsl =
      'table A\n  [a] = 1\n  [b] = 2\napply\nsort -A[a], A[b]\nfilter A[b] = 2\n';
    const sheet = await createEditableTestSheet(dsl);
    const table = sheet.getTable('A');

    // Act
    table.apply!.sort = null;

    // Assert
    expect(sheet.toDSL()).toEqual(
      'table A\n  [a] = 1\n  [b] = 2\napply\nfilter A[b] = 2\n'
    );
  });

  it('should remove filter from apply', async () => {
    // Arrange
    const dsl =
      'table A\n  [a] = 1\n  [b] = 2\napply\nsort -A[a], A[b]\nfilter A[b] = 2\n';
    const sheet = await createEditableTestSheet(dsl);
    const table = sheet.getTable('A');

    // Act
    table.apply!.filter = null;

    // Assert
    expect(sheet.toDSL()).toEqual(
      'table A\n  [a] = 1\n  [b] = 2\napply\nsort -A[a], A[b]\n'
    );
  });

  it('should not break total after removing apply', async () => {
    // Arrange
    const dsl =
      'table A\n  [a] = 1\napply\nsort A[a]\ntotal\n  [a] = A[a].SUM()\n';
    const sheet = await createEditableTestSheet(dsl);
    const table = sheet.getTable('A');
    const oldTotal = table.getTotal(1);

    // Act
    table.apply = null;

    // Assert
    expect(table.getTotal(1)).toBe(oldTotal);
    expect(sheet.toDSL()).toEqual(
      'table A\n  [a] = 1\ntotal\n  [a] = A[a].SUM()\n'
    );
  });
});
