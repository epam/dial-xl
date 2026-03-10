import { excelColToIndex, parseExcelRange, toExcelColName } from '../excel';

describe('toExcelColName', () => {
  it('should return A for values less than 1', () => {
    // Arrange
    const col = 0;
    const expectedValue = 'A';

    // Act
    const result = toExcelColName(col);

    // Assert
    expect(result).toEqual(expectedValue);
  });

  it('should floor decimal values before conversion', () => {
    // Arrange
    const col = 26.9;
    const expectedValue = 'Z';

    // Act
    const result = toExcelColName(col);

    // Assert
    expect(result).toEqual(expectedValue);
  });

  it('should convert 27 to AA', () => {
    // Arrange
    const col = 27;
    const expectedValue = 'AA';

    // Act
    const result = toExcelColName(col);

    // Assert
    expect(result).toEqual(expectedValue);
  });

  it('should convert max excel column index to XFD', () => {
    // Arrange
    const col = 16384;
    const expectedValue = 'XFD';

    // Act
    const result = toExcelColName(col);

    // Assert
    expect(result).toEqual(expectedValue);
  });
});

describe('excelColToIndex', () => {
  it('should return null for empty value', () => {
    // Arrange
    const letters = '';

    // Act
    const result = excelColToIndex(letters);

    // Assert
    expect(result).toBeNull();
  });

  it('should return null for lowercase letters', () => {
    // Arrange
    const letters = 'aa';

    // Act
    const result = excelColToIndex(letters);

    // Assert
    expect(result).toBeNull();
  });

  it('should convert A to 1', () => {
    // Arrange
    const letters = 'A';
    const expectedValue = 1;

    // Act
    const result = excelColToIndex(letters);

    // Assert
    expect(result).toEqual(expectedValue);
  });

  it('should convert XFD to 16384', () => {
    // Arrange
    const letters = 'XFD';
    const expectedValue = 16384;

    // Act
    const result = excelColToIndex(letters);

    // Assert
    expect(result).toEqual(expectedValue);
  });
});

describe('parseExcelRange', () => {
  it('should parse one cell range', () => {
    // Arrange
    const input = 'B2';
    const expectedValue = {
      startRow: 2,
      endRow: 2,
      startCol: 2,
      endCol: 2,
    };

    // Act
    const result = parseExcelRange(input);

    // Assert
    expect(result).toEqual(expectedValue);
  });

  it('should normalize reversed ranges', () => {
    // Arrange
    const input = 'D5:B2';
    const expectedValue = {
      startRow: 2,
      endRow: 5,
      startCol: 2,
      endCol: 4,
    };

    // Act
    const result = parseExcelRange(input);

    // Assert
    expect(result).toEqual(expectedValue);
  });

  it('should trim spaces, remove dollars and parse lowercase input', () => {
    // Arrange
    const input = '  $a$1:$b$2  ';
    const expectedValue = {
      startRow: 1,
      endRow: 2,
      startCol: 1,
      endCol: 2,
    };

    // Act
    const result = parseExcelRange(input);

    // Assert
    expect(result).toEqual(expectedValue);
  });

  it('should return null for invalid format', () => {
    // Arrange
    const input = 'A1:B';

    // Act
    const result = parseExcelRange(input);

    // Assert
    expect(result).toBeNull();
  });

  it('should return null for out of excel bounds', () => {
    // Arrange
    const input = 'XFE1';

    // Act
    const result = parseExcelRange(input);

    // Assert
    expect(result).toBeNull();
  });
});
