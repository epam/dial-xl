import { getTotalType } from '../getTotalType';

describe('getTotalType', () => {
  it('should return correct defined simple total type', () => {
    // Arrange
    const types = [
      'sum',
      'average',
      'count',
      'stdevs',
      'median',
      'mode',
      'min',
      'max',
    ];

    types.forEach((type) => {
      const value = `${type.toUpperCase()}(Table1[a])`;
      const expectedResult = type;

      // Act
      const result = getTotalType('Table1', 'a', value);

      // Assert
      expect(result).toEqual(expectedResult);
    });
  });

  it('should return unique count type', () => {
    // Arrange
    const value = 'COUNT(UNIQUE(Table1[a]))';
    const expectedResult = 'countUnique';

    // Act
    const result = getTotalType('Table1', 'a', value);

    // Assert
    expect(result).toEqual(expectedResult);
  });

  it('should return custom type for correct formula with another formula inside', () => {
    // Arrange
    const value = 'SUM(MIN(Table1[a]))';
    const expectedResult = 'custom';

    // Act
    const result = getTotalType('Table1', 'a', value);

    // Assert
    expect(result).toEqual(expectedResult);
  });

  it('should return custom type for any non-defined formula', () => {
    // Arrange
    const value = 'SUM(Table1[a]) + MIN(Table1[b])';
    const expectedResult = 'custom';

    // Act
    const result = getTotalType('Table1', 'a', value);

    // Assert
    expect(result).toEqual(expectedResult);
  });

  it('should return custom type for formulas without functions', () => {
    // Arrange
    const value = '22';
    const expectedResult = 'custom';

    // Act
    const result = getTotalType('Table1', 'a', value);

    // Assert
    expect(result).toEqual(expectedResult);
  });
});
