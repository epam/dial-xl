import { createUniqueFileName, createUniqueName } from '../createUniqueName';

describe('createUniqueName', () => {
  it('should return default name if no existing names', () => {
    // Arrange
    const name = 'Field1';
    const existingNames: string[] = [];

    // Act
    const result = createUniqueName(name, existingNames);

    // Assert
    expect(result).toBe(name);
  });

  it('should return default name if existing names are missing', () => {
    // Arrange
    const name = 'Field1';

    // Act
    const result = createUniqueName(name);

    // Assert
    expect(result).toBe(name);
  });

  it('should return empty string if name is missing', () => {
    // Act
    const result = createUniqueName();

    // Assert
    expect(result).toBe('');
  });

  it('should return unique name based on existing names', () => {
    // Arrange
    const name = 'Field1';
    const existingNames: string[] = ['Field1', 'Field2'];

    // Act
    const result = createUniqueName(name, existingNames);

    // Assert
    expect(result).toBe('Field3');
  });

  it('should return unique name for a string without index in the end', () => {
    // Arrange
    const name = 'Field';
    const existingNames: string[] = ['Field', 'Field1'];

    // Act
    const result = createUniqueName(name, existingNames);

    // Assert
    expect(result).toBe('Field2');
  });

  it('should return unique name for an index name', () => {
    // Arrange
    const name = '3';
    const existingNames: string[] = ['3', 'Field1', 'Field2'];

    // Act
    const result = createUniqueName(name, existingNames);

    // Assert
    expect(result).toBe('1');
  });

  it('should treat names with different cases as unique', () => {
    // Arrange
    const name = 'Stat';
    const existingNames = ['stat', 'STAT', 'sTaT'];

    // Act
    const result = createUniqueName(name, existingNames);

    // Assert
    expect(result).toBe('Stat');
  });

  it('should create a unique name if the same case name exists', () => {
    // Arrange
    const name = 'Stat';
    const existingNames = ['Stat', 'Stat1', 'Stat2'];

    // Act
    const result = createUniqueName(name, existingNames);

    // Assert
    expect(result).toBe('Stat3');
  });

  it('should create unique file name', () => {
    const result = createUniqueFileName('countries_2022_2023.csv', [
      'countries_2022_2023.csv',
    ]);
    expect(result).toBe('countries_2022_2023 (1).csv');
  });

  it('should increase index when create unique file name', () => {
    const result = createUniqueFileName('countries_2022_2023 (1).csv', [
      'countries_2022_2023.csv',
      'countries_2022_2023 (1).csv',
    ]);
    expect(result).toBe('countries_2022_2023 (2).csv');
  });
});
