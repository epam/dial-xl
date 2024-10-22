import { findLastChangedTable } from '../findLastChangedTable';

describe('findLastChangedTable', () => {
  it('should return null if there are no changes', () => {
    // Arrange
    const oldDsl = 'table t1 dim [f1]=range(20)';

    // Act
    const result = findLastChangedTable(oldDsl, oldDsl);

    // Assert
    expect(result).toBeNull();
  });

  it('should return changed table', () => {
    // Arrange
    const oldDsl = 'table t1 dim [f1]=range(20)';
    const newDsl = 'table t1 dim [f1]=range(20) table t2 dim [f2]=range(10)';

    // Act
    const result = findLastChangedTable(oldDsl, newDsl);

    // Assert
    expect(result).not.toBeNull();
    expect(result?.tableName).toEqual('t2');
  });

  it('should return last changed table', () => {
    // Arrange
    const oldDsl = 'table t1 dim [f1]=range(20)';
    const newDsl =
      'table t1 dim [f1]=range(20) table t2 dim [f2]=range(10) table t3 dim [f3]=range(5)';

    // Act
    const result = findLastChangedTable(oldDsl, newDsl);

    // Assert
    expect(result).not.toBeNull();
    expect(result?.tableName).toBe('t3');
  });

  it('should return table if there is a change in existing table', () => {
    // Arrange
    const oldDsl = 'table t1 dim [f1]=range(20)';
    const newDsl = 'table t1 dim [f2]=range(30)';

    // Act
    const result = findLastChangedTable(oldDsl, newDsl);

    // Assert
    expect(result).not.toBeNull();
    expect(result?.tableName).toBe('t1');
  });

  it('should return table if it was renamed', () => {
    // Arrange
    const oldDsl = 'table t1 dim [f1]=range(20)';
    const newDsl = 'table t2 dim [f1]=range(20)';

    // Act
    const result = findLastChangedTable(oldDsl, newDsl);

    // Assert
    expect(result).not.toBeNull();
    expect(result?.tableName).toBe('t2');
  });
});
