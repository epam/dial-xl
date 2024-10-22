import { FunctionInfo } from '@frontend/common';

import { functionsToUppercase } from '../functionsToUppercase';

export const functionsMock: FunctionInfo[] = [
  {
    name: 'RANGE',
    arguments: [],
    description: '',
  },
  {
    name: 'FILTER',
    arguments: [],
    description: '',
  },
  {
    name: 'PIVOT',
    arguments: [],
    description: '',
  },
  {
    name: 'PERIODSERIES',
    arguments: [],
    description: '',
  },
];

describe('functionsToUppercase', () => {
  it('should return same expression if all function names are uppercase', () => {
    // Arrange
    const expression = 'RANGE(100)';

    // Act
    const result = functionsToUppercase(expression, functionsMock);

    // Assert
    expect(result).toBe(expression);
  });

  it('should make function name uppercase', () => {
    // Arrange
    const expression = 'T.filter($[a] > 0)';
    const expectedExpression = 'T.FILTER($[a] > 0)';

    // Act
    const result = functionsToUppercase(expression, functionsMock);

    // Assert
    expect(result).toBe(expectedExpression);
  });

  it('should make all function names uppercase', () => {
    // Arrange
    const expression =
      'pivOT([rows], $[indicator], periodseries($, $[time], $[value], "YEAR"))';
    const expectedExpression =
      'PIVOT([rows], $[indicator], PERIODSERIES($, $[time], $[value], "YEAR"))';

    // Act
    const result = functionsToUppercase(expression, functionsMock);

    // Assert
    expect(result).toBe(expectedExpression);
  });
});
