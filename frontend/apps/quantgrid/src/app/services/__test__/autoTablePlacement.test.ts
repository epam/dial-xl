import { autoTablePlacement } from '../autoTablePlacement';

describe('autoTablePlacement', () => {
  it('should do nothing if tables have placement', () => {
    // Arrange
    const dsl =
      '!placement(1,1) table t1 [f1]=2 [f2]=3 [f1]=4 !placement(3,3) table t2 [f1]=2 [f2]=3 [f1]=4';

    // Act
    const result = autoTablePlacement(dsl);

    // Assert
    expect(result).toBe(dsl);
  });

  it('should place table after table with placement', () => {
    // Arrange
    const dsl =
      '!placement(1,1) table t1 [f1]=2 [f2]=3 [f1]=4 table t2 [f1]=2 [f2]=3 [f1]=4';
    const expectedDsl =
      '!placement(1,1) table t1 [f1]=2 [f2]=3 [f1]=4 !placement(1,5)\r\ntable t2 [f1]=2 [f2]=3 [f1]=4';

    // Act
    const result = autoTablePlacement(dsl);

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should place all tables between tables with placement', () => {
    // Arrange
    const dsl =
      '!placement(7,2) table t1 [f1]=2 !placement(7,6) table t2 [f1]=2 [f2]=3 table t3 [f1]=2 [f2]=3 [f3]=4 table t4 [f1]=1';
    const expectedDsl =
      '!placement(7,2) table t1 [f1]=2 !placement(7,6) table t2 [f1]=2 [f2]=3 !placement(1,9)\r\ntable t3 [f1]=2 [f2]=3 [f3]=4 !placement(1,4)\r\ntable t4 [f1]=1';

    // Act
    const result = autoTablePlacement(dsl);

    // Assert
    expect(result).toBe(expectedDsl);
  });
});
