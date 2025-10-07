import { SheetReader } from '../../SheetReader';
import { findFunctionExpressions } from '../findFunctionExpressions';

describe('findFunctionExpressions', () => {
  it('should not find function in a formula without functions', () => {
    // Arrange
    const expression = SheetReader.parseFormula('[source][Name]');

    // Act
    const result = findFunctionExpressions(expression);

    // Assert
    expect(result).toHaveLength(0);
  });

  it('should find a single function', () => {
    // Arrange
    const expression = SheetReader.parseFormula('RANGE(10)');

    // Act
    const result = findFunctionExpressions(expression);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        end: 4,
        start: 0,
        name: 'RANGE',
      })
    );
  });

  it('should find multiple functions', () => {
    // Arrange
    const expression = SheetReader.parseFormula(
      `'some table'.FILTER([Name] = $[Name]).COUNT() > 0`
    );

    // Act
    const result = findFunctionExpressions(expression);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(
      expect.objectContaining({
        start: 38,
        end: 42,
        name: 'COUNT',
      })
    );
    expect(result[1]).toEqual(
      expect.objectContaining({
        start: 13,
        end: 18,
        name: 'FILTER',
      })
    );
  });

  it('should find input function', () => {
    // Arrange
    const expression = SheetReader.parseFormula(
      `INPUT("files/abc123/appdata/xl/project/input.csv")[[id], [name], [country]]`
    );

    // Act
    const result = findFunctionExpressions(expression);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        start: 0,
        end: 4,
        name: 'INPUT',
      })
    );
  });

  it('should find nested functions', () => {
    // Arrange
    const expression = SheetReader.parseFormula(
      'SORT(UNIQUE(InputData[indicator]))'
    );

    // Act
    const result = findFunctionExpressions(expression);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(
      expect.objectContaining({
        start: 0,
        end: 3,
        name: 'SORT',
      })
    );
    expect(result[1]).toEqual(
      expect.objectContaining({
        start: 5,
        end: 10,
        name: 'UNIQUE',
      })
    );
  });

  it('should not throw on exception', () => {
    // Arrange
    const expression = SheetReader.parseFormula(`'A'(1)`);

    // Act
    const result = findFunctionExpressions(expression);

    // Assert
    expect(result).toHaveLength(0);
  });
});
