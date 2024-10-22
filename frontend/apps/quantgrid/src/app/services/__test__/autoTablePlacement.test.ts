import { autoTablePlacement } from '../autoTablePlacement';

describe('autoTablePlacement', () => {
  it('should do nothing if tables have placement', () => {
    // Arrange
    const dsl =
      '!placement(1,1) table t1 [f1]=2\r\n[f2]=3\r\n[f1]=4\r\n!placement(3,3) table t2 [f1]=2\r\n[f2]=3\r\n[f1]=4';

    // Act
    const result = autoTablePlacement(dsl);

    // Assert
    expect(result).toBe(dsl);
  });

  it('should place table after table with placement', () => {
    // Arrange
    const dsl =
      '!placement(1,1) table t1 [f1]=2\r\n[f2]=3\r\n[f1]=4\r\ntable t2 [f1]=2\r\n[f2]=3\r\n[f1]=4';
    const expectedDsl =
      '!placement(1,1) table t1 [f1]=2\r\n[f2]=3\r\n[f1]=4\r\n!placement(1,5)\r\ntable t2 [f1]=2\r\n[f2]=3\r\n[f1]=4';

    // Act
    const result = autoTablePlacement(dsl);

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should place all tables between tables with placement', () => {
    // Arrange
    const dsl =
      '!placement(7,2) table t1 [f1]=2\r\n!placement(7,6) table t2 [f1]=2\r\n[f2]=3\r\ntable t3 [f1]=2\r\n[f2]=3\r\n[f3]=4\r\ntable t4 [f1]=1';
    const expectedDsl =
      '!placement(7,2) table t1 [f1]=2\r\n!placement(7,6) table t2 [f1]=2\r\n[f2]=3\r\n!placement(1,9)\r\ntable t3 [f1]=2\r\n[f2]=3\r\n[f3]=4\r\n!placement(1,4)\r\ntable t4 [f1]=1';

    // Act
    const result = autoTablePlacement(dsl);

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should fix table position to be inside spreadsheet edges', () => {
    // Arrange
    const dsl = '!placement(0, 0) table t1 [f1]=2\r\n[f2]=3\r\n[f1]=4';
    const expectedDsl = '!placement(1, 1) table t1 [f1]=2\r\n[f2]=3\r\n[f1]=4';

    // Act
    const result = autoTablePlacement(dsl);

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should fix multiple table positions to be inside spreadsheet edges', () => {
    // Arrange
    const dsl =
      '!placement(0, 0) table t1 [f1]=2\r\n!placement(0, 11) table t2 [f1]=2';
    const expectedDsl =
      '!placement(1, 1) table t1 [f1]=2\r\n!placement(1, 11) table t2 [f1]=2';

    // Act
    const result = autoTablePlacement(dsl);

    // Assert
    expect(result).toBe(expectedDsl);
  });
});
