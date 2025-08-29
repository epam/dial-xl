import { getFormulaType, stripQuotesBrackets } from '../formula';

describe('formula', () => {
  describe('getFormulaType', () => {
    it('should return single dimension type', () => {
      // Arrange
      const value = 't1:t2';

      // Act
      const result = getFormulaType(value);

      // Assert
      expect(result).toEqual('single_dim');
    });

    it('should return multi dimension type', () => {
      // Arrange
      const value = 't1:t2:t3';

      // Act
      const result = getFormulaType(value);

      // Assert
      expect(result).toEqual('multi_dim');
    });

    it('should return formula type', () => {
      // Arrange
      const value = '[field] = 1';

      // Act
      const result = getFormulaType(value);

      // Assert
      expect(result).toEqual('formula');
    });

    it('should return formula type if there is colon inside quotes', () => {
      // Arrange
      const value = '[link] = "https://web.com" + 1';

      // Act
      const result = getFormulaType(value);

      // Assert
      expect(result).toEqual('formula');
    });

    it('should return const type', () => {
      // Arrange
      const value = '44';

      // Act
      const result = getFormulaType(value);

      // Assert
      expect(result).toEqual('const');
    });
  });

  describe('stripValuesInsideQuotes', () => {
    it('should strip content from the double quotes', () => {
      // Arrange
      const value = 'link = "https://web.com" + 1';
      const expectedResult = 'link = "" + 1';

      // Act
      const result = stripQuotesBrackets(value);

      // Assert
      expect(result).toEqual(expectedResult);
    });

    it('should strip content from the single quotes', () => {
      // Arrange
      const value = `link = 'https://web.com' + 1`;
      const expectedResult = `link = '' + 1`;

      // Act
      const result = stripQuotesBrackets(value);

      // Assert
      expect(result).toEqual(expectedResult);
    });

    it('should strip content from the brackets', () => {
      // Arrange
      const value = `= Table1(2)[VS: Regional Origin]`;
      const expectedResult = `= Table1()[]`;

      // Act
      const result = stripQuotesBrackets(value);

      // Assert
      expect(result).toEqual(expectedResult);
    });
  });
});
