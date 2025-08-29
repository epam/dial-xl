import { autoFunctionsToUppercase } from '../autoFunctionsToUppercase';
import { functionsMock } from './functionsToUppercase.test';

describe('autoFunctionsToUppercase', () => {
  it('should uppercase one lowercase function', () => {
    // Arrange
    const dsl = 'table t1 dim [f1]=range(20)';
    const expectedDsl = 'table t1 dim [f1]=RANGE(20)';

    // Act
    const result = autoFunctionsToUppercase(dsl, functionsMock);

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should uppercase single letter function', () => {
    // Arrange
    const dsl = 'table t1 [f1]=f(20)';
    const expectedDsl = 'table t1 [f1]=F(20)';

    // Act
    const result = autoFunctionsToUppercase(dsl, functionsMock);

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should uppercase multiple lowercase functions', () => {
    // Arrange
    const dsl = 'table t1 dim [f1]=range(20) table t2 dim [f2]=rAngE(10)';
    const expectedDsl =
      'table t1 dim [f1]=RANGE(20) table t2 dim [f2]=RANGE(10)';

    // Act
    const result = autoFunctionsToUppercase(dsl, functionsMock);

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should uppercase multiple complex lowercase functions', () => {
    // Arrange
    const dsl =
      'table t1 dim [f1]=pivot([rows], $[indicator], periodseries($, $[time], $[value], "YEAR")) table t2 dim [f2]=range(10)';
    const expectedDsl =
      'table t1 dim [f1]=PIVOT([rows], $[indicator], PERIODSERIES($, $[time], $[value], "YEAR")) table t2 dim [f2]=RANGE(10)';

    // Act
    const result = autoFunctionsToUppercase(dsl, functionsMock);

    // Assert
    expect(result).toBe(expectedDsl);
  });
});
