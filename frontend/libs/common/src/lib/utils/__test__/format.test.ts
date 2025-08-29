import {
  CurrencyFormatArgs,
  DateFormatArgs,
  FormatType,
  NumberFormatArgs,
  PercentageFormatArgs,
  ScientificFormatArgs,
} from '../../services';
import { formatValue } from '../format';

describe('formatValue', () => {
  it('should return same value as passed if passed value not parseable to float', () => {
    // Arrange
    const value = 'SOME VALUE';
    const format = 'any format' as FormatType;
    const expectedValue = 'SOME VALUE';

    // Act
    const displayValue = formatValue(value, { type: format });

    // Assert
    expect(displayValue).toEqual(expectedValue);
  });

  describe('Unknown format', () => {
    it('should return same value as passed value', () => {
      // Arrange
      const value = '123.1123';
      const format = 'any format' as FormatType;

      // Act
      const displayValue = formatValue(value, { type: format });

      // Assert
      expect(displayValue).toEqual(value);
    });
  });

  describe('FORMAT_TYPE_GENERAL', () => {
    it('should return same value as passed value', () => {
      // Arrange
      const value = '123.1';
      const format = FormatType.FORMAT_TYPE_GENERAL;

      // Act
      const displayValue = formatValue(value, { type: format });

      // Assert
      expect(displayValue).toEqual(value);
    });
  });

  describe('FORMAT_TYPE_BOOLEAN', () => {
    it('should return FALSE when value is 0', () => {
      // Arrange
      const value = '0';
      const format = FormatType.FORMAT_TYPE_BOOLEAN;
      const expectedValue = 'FALSE';

      // Act
      const displayValue = formatValue(value, { type: format });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
    it('should return TRUE when value is 1', () => {
      // Arrange
      const value = '1';
      const format = FormatType.FORMAT_TYPE_BOOLEAN;
      const expectedValue = 'TRUE';

      // Act
      const displayValue = formatValue(value, { type: format });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
    it('should return TRUE when value is bigger than 0', () => {
      // Arrange
      const value = '123';
      const format = FormatType.FORMAT_TYPE_BOOLEAN;
      const expectedValue = 'TRUE';

      // Act
      const displayValue = formatValue(value, { type: format });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
  });

  describe('FORMAT_TYPE_NUMBER', () => {
    it('should return same number 0 when value 0 passed', () => {
      // Arrange
      const value = '0';
      const format = FormatType.FORMAT_TYPE_NUMBER;
      const formatArgs: NumberFormatArgs = {
        useThousandsSeparator: false,
        format: 0,
      };
      const expectedValue = '0';

      // Act
      const displayValue = formatValue(value, {
        type: format,
        numberArgs: formatArgs,
      });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
    it('should return number 123.000 when value 123 passed with 3 decimal digits arg passed', () => {
      // Arrange
      const value = '123';
      const format = FormatType.FORMAT_TYPE_NUMBER;
      const formatArgs: NumberFormatArgs = {
        useThousandsSeparator: false,
        format: 3,
      };
      const expectedValue = '123.000';

      // Act
      const displayValue = formatValue(value, {
        type: format,
        numberArgs: formatArgs,
      });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
    it('should return number 123.110 when float value 123.11 passed with 3 decimal digits arg', () => {
      // Arrange
      const value = '123.11';
      const format = FormatType.FORMAT_TYPE_NUMBER;
      const formatArgs: NumberFormatArgs = {
        useThousandsSeparator: false,
        format: 3,
      };
      const expectedValue = '123.110';

      // Act
      const displayValue = formatValue(value, {
        type: format,
        numberArgs: formatArgs,
      });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
    it('should return number `123,123.1` when value `123123.11` passed and thousand operator used with 1 decimal digit', () => {
      // Arrange
      const value = '123123.11';
      const format = FormatType.FORMAT_TYPE_NUMBER;
      const formatArgs: NumberFormatArgs = {
        useThousandsSeparator: true,
        format: 1,
      };
      const expectedValue = '123,123.1';

      // Act
      const displayValue = formatValue(value, {
        type: format,
        numberArgs: formatArgs,
      });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
  });
  describe('FORMAT_TYPE_SCIENTIFIC', () => {
    it('should return number 0E+0 when value 0 passed and decimal digits were 0', () => {
      // Arrange
      const value = '0';
      const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
      const formatArgs: ScientificFormatArgs = {
        format: 0,
      };
      const expectedValue = '0E+0';

      // Act
      const displayValue = formatValue(value, {
        type: format,
        scientificArgs: formatArgs,
      });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
    it('should return number 1.230E+2 when value 123 passed with 2 decimal digits arg passed', () => {
      // Arrange
      const value = '123';
      const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
      const formatArgs: ScientificFormatArgs = {
        format: 3,
      };
      const expectedValue = '1.230E+2';

      // Act
      const displayValue = formatValue(value, {
        type: format,
        scientificArgs: formatArgs,
      });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
    it('should return number 1.23110E+2 when float value 123.11 passed with 5 decimal digits arg', () => {
      // Arrange
      const value = '123.11';
      const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
      const formatArgs: ScientificFormatArgs = {
        format: 5,
      };
      const expectedValue = '1.23110E+2';

      // Act
      const displayValue = formatValue(value, {
        type: format,
        scientificArgs: formatArgs,
      });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
  });
  describe('FORMAT_TYPE_PERCENTAGE', () => {
    it('should return 0% when value 0 passed with 0 decimal digits', () => {
      // Arrange
      const value = '0';
      const format = FormatType.FORMAT_TYPE_PERCENTAGE;
      const formatArgs: PercentageFormatArgs = {
        format: 0,
      };
      const expectedValue = '0%';

      // Act
      const displayValue = formatValue(value, {
        type: format,
        percentageArgs: formatArgs,
      });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
    it('should return number 12300.000% when value 123 passed with 3 decimal digits arg passed', () => {
      // Arrange
      const value = '123';
      const format = FormatType.FORMAT_TYPE_PERCENTAGE;
      const formatArgs: PercentageFormatArgs = {
        format: 3,
      };
      const expectedValue = '12300.000%';

      // Act
      const displayValue = formatValue(value, {
        type: format,
        percentageArgs: formatArgs,
      });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
    it('should return number 12311.000% when float value 123.11 passed with 3 decimal digits arg', () => {
      // Arrange
      const value = '123.11';
      const format = FormatType.FORMAT_TYPE_PERCENTAGE;
      const formatArgs = {
        format: 3,
      } as PercentageFormatArgs;
      const expectedValue = '12311.000%';

      // Act
      const displayValue = formatValue(value, {
        type: format,
        percentageArgs: formatArgs,
      });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
  });
  describe('FORMAT_TYPE_DATE', () => {
    it('should return `30.12.1899 12:00:00 AM` when value 1 passed and pattern `dd.MM.yyyy hh:mm:ss aa`', () => {
      // Arrange
      const value = '0';
      const format = FormatType.FORMAT_TYPE_DATE;
      const formatArgs: DateFormatArgs = {
        pattern: 'dd.MM.yyyy hh:mm:ss aa',
      };
      const expectedValue = '30.12.1899 12:00:00 AM';

      // Act
      const displayValue = formatValue(value, {
        type: format,
        dateArgs: formatArgs,
      });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
    it('should return `31.12.1899 12:00:00 AM` when value 1 passed and pattern `dd.MM.yyyy hh:mm:ss aa`', () => {
      // Arrange
      const value = '1';
      const format = FormatType.FORMAT_TYPE_DATE;
      const formatArgs: DateFormatArgs = {
        pattern: 'dd.MM.yyyy hh:mm:ss aa',
      };
      const expectedValue = '31.12.1899 12:00:00 AM';

      // Act
      const displayValue = formatValue(value, {
        type: format,
        dateArgs: formatArgs,
      });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
    it('should return `01.01.1900 12:00:00 AM` when value 1 passed and pattern `dd.MM.yyyy hh:mm:ss aa`', () => {
      // Arrange
      const value = '2';
      const format = FormatType.FORMAT_TYPE_DATE;
      const formatArgs: DateFormatArgs = {
        pattern: 'dd.MM.yyyy hh:mm:ss aa',
      };
      const expectedValue = '01.01.1900 12:00:00 AM';

      // Act
      const displayValue = formatValue(value, {
        type: format,
        dateArgs: formatArgs,
      });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
    it('should return `14.11.2024 02:38:24 AM"` when value 45610.11 passed and pattern `dd.MM.yyyy hh:mm:ss`', () => {
      // Arrange
      const value = '45610.11';
      const format = FormatType.FORMAT_TYPE_DATE;
      const formatArgs: DateFormatArgs = {
        pattern: 'dd.MM.yyyy hh:mm:ss aa',
      };
      const expectedValue = '14.11.2024 02:38:24 AM';

      // Act
      const displayValue = formatValue(value, {
        type: format,
        dateArgs: formatArgs,
      });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
  });
  describe('FORMAT_TYPE_CURRENCY', () => {
    it('should return `$ 0` when value 0 passed with symbol `$`', () => {
      // Arrange
      const value = '0';
      const format = FormatType.FORMAT_TYPE_CURRENCY;
      const formatArgs: CurrencyFormatArgs = {
        format: 0,
        symbol: '$',
        useThousandsSeparator: false,
      };
      const expectedValue = '$ 0';

      // Act
      const displayValue = formatValue(value, {
        type: format,
        currencyArgs: formatArgs,
      });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
    it('should return number `$ 123.00` when value 123 passed with 2 decimal digits, symbol $ args passed', () => {
      // Arrange
      const value = '123';
      const format = FormatType.FORMAT_TYPE_CURRENCY;
      const formatArgs: CurrencyFormatArgs = {
        format: 2,
        symbol: '$',
        useThousandsSeparator: false,
      };
      const expectedValue = '$ 123.00';

      // Act
      const displayValue = formatValue(value, {
        type: format,
        currencyArgs: formatArgs,
      });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
    it('should return number `$ 1,233.110` when float value 1233.11 passed with 3 decimal digits, symbol $, use thousand operator args passed', () => {
      // Arrange
      const value = '1233.11';
      const format = FormatType.FORMAT_TYPE_CURRENCY;
      const formatArgs: CurrencyFormatArgs = {
        format: 3,
        symbol: '$',
        useThousandsSeparator: true,
      };
      const expectedValue = '$ 1,233.110';

      // Act
      const displayValue = formatValue(value, {
        type: format,
        currencyArgs: formatArgs,
      });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
  });
});
