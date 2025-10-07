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
    describe('Total digits', () => {
      it('should return number 123.5K when value 1234 and total digits -2 is more than minimum of -4', () => {
        // Arrange
        const value = '12345';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          useThousandsSeparator: false,
          format: -2,
        };
        const expectedValue = '12.35K';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 12 when value 12 and total digits 5', () => {
        // Arrange
        const value = '12';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '12';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1234 when value 1234 and total digits 5', () => {
        // Arrange
        const value = '1234';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '1234';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 12345 when value 12345 and total digits 5', () => {
        // Arrange
        const value = '12345';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '12345';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 123.46K when value 123456 and total digits 5', () => {
        // Arrange
        const value = '123456';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '123.46K';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1,000K when value 1000000 and total digits 4 and thousand operator presented', () => {
        // Arrange
        const value = '1000000';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          useThousandsSeparator: true,
          format: -4,
        };
        const expectedValue = '1,000K';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });

      it('should return number 0.42 when value 0.42 and total digits 5', () => {
        // Arrange
        const value = '0.42';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '0.42';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 0.042 when value 0.042 and total digits 5', () => {
        // Arrange
        const value = '0.042';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '0.042';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 0.0423 when value 0.0423 and total digits 5', () => {
        // Arrange
        const value = '0.0423';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '0.0423';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 0.0424 when value 0.04235 and total digits 5', () => {
        // Arrange
        const value = '0.04235';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '0.0424';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1E-7 when value 0.0000001 and total digits 5', () => {
        // Arrange
        const value = '0.0000001';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          useThousandsSeparator: false,
          format: -4,
        };
        const expectedValue = '1E-7';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1E-7 when value 1E-7 and total digits 5', () => {
        // Arrange
        const value = '1E-7';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '1E-7';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.234E-7 when value 0.0000001234 and total digits 5', () => {
        // Arrange
        const value = '0.0000001234';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '1.234E-7';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.234E-7 when value 1.234E-7 and total digits 5', () => {
        // Arrange
        const value = '1.234E-7';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '1.234E-7';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.235E-7 when value 0.00000012346 and total digits 5', () => {
        // Arrange
        const value = '0.00000012346';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '1.235E-7';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.235E-7 when value 1.2346E-7 and total digits 5', () => {
        // Arrange
        const value = '1.2367E-7';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '1.237E-7';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.23E15 when value 1230000000000000 and total digits 5', () => {
        // Arrange
        const value = '1230000000000000';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '1.23E15';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.23E15 when value 1.23E15 and total digits 5', () => {
        // Arrange
        const value = '1.23E15';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '1.23E15';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });

      describe('Jumps between different total digits formats', () => {
        it('should return number 1000000000 when value 1 000 000 000 and total digits 10', () => {
          // Arrange
          const value = '1000000000';
          const format = FormatType.FORMAT_TYPE_NUMBER;
          const formatArgs: NumberFormatArgs = {
            useThousandsSeparator: false,
            format: -10,
          };
          const expectedValue = '1000000000';

          // Act
          const displayValue = formatValue(value, {
            type: format,
            numberArgs: formatArgs,
          });

          // Assert
          expect(displayValue).toEqual(expectedValue);
        });
        it('should return number 1000000K when value 1 000 000 000 and total digits 9', () => {
          // Arrange
          const value = '1000000000';
          const format = FormatType.FORMAT_TYPE_NUMBER;
          const formatArgs: NumberFormatArgs = {
            useThousandsSeparator: false,
            format: -9,
          };
          const expectedValue = '1000000K';

          // Act
          const displayValue = formatValue(value, {
            type: format,
            numberArgs: formatArgs,
          });

          // Assert
          expect(displayValue).toEqual(expectedValue);
        });
        it('should return number 1000M when value 1 000 000 000 and total digits 6', () => {
          // Arrange
          const value = '1000000000';
          const format = FormatType.FORMAT_TYPE_NUMBER;
          const formatArgs: NumberFormatArgs = {
            useThousandsSeparator: false,
            format: -6,
          };
          const expectedValue = '1000M';

          // Act
          const displayValue = formatValue(value, {
            type: format,
            numberArgs: formatArgs,
          });

          // Assert
          expect(displayValue).toEqual(expectedValue);
        });
        it('should return number 1000M when value 1 000 000 000 and total digits 4', () => {
          // Arrange
          const value = '1000000000';
          const format = FormatType.FORMAT_TYPE_NUMBER;
          const formatArgs: NumberFormatArgs = {
            useThousandsSeparator: false,
            format: -4,
          };
          const expectedValue = '1000M';

          // Act
          const displayValue = formatValue(value, {
            type: format,
            numberArgs: formatArgs,
          });

          // Assert
          expect(displayValue).toEqual(expectedValue);
        });
        it('should return number 1000B when value 1 000 000 000 000 and total digits 4', () => {
          // Arrange
          const value = '1000000000000';
          const format = FormatType.FORMAT_TYPE_NUMBER;
          const formatArgs: NumberFormatArgs = {
            useThousandsSeparator: false,
            format: -4,
          };
          const expectedValue = '1000B';

          // Act
          const displayValue = formatValue(value, {
            type: format,
            numberArgs: formatArgs,
          });

          // Assert
          expect(displayValue).toEqual(expectedValue);
        });
        it('should return number 1000B when value 1 000 000 000 000 and total digits 4', () => {
          // Arrange
          const value = '1000000000000';
          const format = FormatType.FORMAT_TYPE_NUMBER;
          const formatArgs: NumberFormatArgs = {
            useThousandsSeparator: false,
            format: -4,
          };
          const expectedValue = '1000B';

          // Act
          const displayValue = formatValue(value, {
            type: format,
            numberArgs: formatArgs,
          });

          // Assert
          expect(displayValue).toEqual(expectedValue);
        });
        it('should return number 1E15 when value 1 000 000 000 000 000 and total digits 4', () => {
          // Arrange
          const value = '1000000000000000';
          const format = FormatType.FORMAT_TYPE_NUMBER;
          const formatArgs: NumberFormatArgs = {
            useThousandsSeparator: false,
            format: -4,
          };
          const expectedValue = '1E15';

          // Act
          const displayValue = formatValue(value, {
            type: format,
            numberArgs: formatArgs,
          });

          // Assert
          expect(displayValue).toEqual(expectedValue);
        });
      });
    });

    describe('Compact precision', () => {
      it('should return 0 when value 0 passed and K format precision used', () => {
        // Arrange
        const value = '0K';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          format: 'K',
          useThousandsSeparator: false,
        };
        const expectedValue = '0K';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return 0K when value 1 passed and K format precision used', () => {
        // Arrange
        const value = '1';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          format: 'K',
          useThousandsSeparator: false,
        };
        const expectedValue = '0K';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return 1.2K when float value 123.11 passed and K format precision used', () => {
        // Arrange
        const value = '123.11';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          format: 'K',
          useThousandsSeparator: false,
        };
        const expectedValue = '0.1K';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return 123.5K when float value 123456 passed and K format precision used', () => {
        // Arrange
        const value = '123456';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          format: 'K',
          useThousandsSeparator: false,
        };
        const expectedValue = '123.5K';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return 0.1M when float value 123456 passed and M format precision used', () => {
        // Arrange
        const value = '123456';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          format: 'M',
          useThousandsSeparator: false,
        };
        const expectedValue = '0.1M';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });

      it('should return 123.5M when float value 123456789 passed and M format precision used', () => {
        // Arrange
        const value = '123456789';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          format: 'M',
          useThousandsSeparator: false,
        };
        const expectedValue = '123.5M';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });

      it('should return 0.1B when float value 123456789 passed and B format precision used', () => {
        // Arrange
        const value = '123456789';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          format: 'B',
          useThousandsSeparator: false,
        };
        const expectedValue = '0.1B';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });

      it('should return 123.5B when float value 123456789999 passed and B format precision used', () => {
        // Arrange
        const value = '123456789999';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          format: 'B',
          useThousandsSeparator: false,
        };
        const expectedValue = '123.5B';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return 1,000K when float value 1000000 passed and K format precision used and thousand comma', () => {
        // Arrange
        const value = '1000000';
        const format = FormatType.FORMAT_TYPE_NUMBER;
        const formatArgs: NumberFormatArgs = {
          format: 'K',
          useThousandsSeparator: true,
        };
        const expectedValue = '1,000K';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          numberArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
    });
  });
  describe('FORMAT_TYPE_SCIENTIFIC', () => {
    it('should return number 0E0 when value 0 passed and decimal digits were 0', () => {
      // Arrange
      const value = '0';
      const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
      const formatArgs: ScientificFormatArgs = {
        format: 0,
      };
      const expectedValue = '0E0';

      // Act
      const displayValue = formatValue(value, {
        type: format,
        scientificArgs: formatArgs,
      });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
    it('should return number 1.230E2 when value 123 passed with 2 decimal digits arg passed', () => {
      // Arrange
      const value = '123';
      const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
      const formatArgs: ScientificFormatArgs = {
        format: 3,
      };
      const expectedValue = '1.230E2';

      // Act
      const displayValue = formatValue(value, {
        type: format,
        scientificArgs: formatArgs,
      });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });
    it('should return number 1.23110E2 when float value 123.11 passed with 5 decimal digits arg', () => {
      // Arrange
      const value = '123.11';
      const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
      const formatArgs: ScientificFormatArgs = {
        format: 5,
      };
      const expectedValue = '1.23110E2';

      // Act
      const displayValue = formatValue(value, {
        type: format,
        scientificArgs: formatArgs,
      });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });

    describe('Total digits', () => {
      it('should return number 1.23E4 when value 1234 and total digits -2 is more than minimum of -4', () => {
        // Arrange
        const value = '12345';
        const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
        const formatArgs: ScientificFormatArgs = {
          format: -2,
        };
        const expectedValue = '1.23E4';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          scientificArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.2E1 when value 12 and total digits 5', () => {
        // Arrange
        const value = '12';
        const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
        const formatArgs: ScientificFormatArgs = {
          format: -5,
        };
        const expectedValue = '1.2E1';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          scientificArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.234E3 when value 1234 and total digits 5', () => {
        // Arrange
        const value = '1234';
        const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
        const formatArgs: ScientificFormatArgs = {
          format: -5,
        };
        const expectedValue = '1.234E3';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          scientificArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.235E4 when value 12345 and total digits 5', () => {
        // Arrange
        const value = '12345';
        const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
        const formatArgs: ScientificFormatArgs = {
          format: -5,
        };
        const expectedValue = '1.235E4';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          scientificArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.235E5 when value 123456 and total digits 5', () => {
        // Arrange
        const value = '123456';
        const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
        const formatArgs: ScientificFormatArgs = {
          format: -5,
        };
        const expectedValue = '1.235E5';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          scientificArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 4.2E-1 when value 0.42 and total digits 5', () => {
        // Arrange
        const value = '0.42';
        const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
        const formatArgs: ScientificFormatArgs = {
          format: -5,
        };
        const expectedValue = '4.2E-1';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          scientificArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 4.2E-2 when value 0.042 and total digits 5', () => {
        // Arrange
        const value = '0.042';
        const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
        const formatArgs: ScientificFormatArgs = {
          format: -5,
        };
        const expectedValue = '4.2E-2';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          scientificArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 4.236E-2 when value 0.042356 and total digits 5', () => {
        // Arrange
        const value = '0.042356';
        const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
        const formatArgs: ScientificFormatArgs = {
          format: -5,
        };
        const expectedValue = '4.236E-2';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          scientificArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1E-7 when value 0.0000001 and total digits 5', () => {
        // Arrange
        const value = '0.0000001';
        const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
        const formatArgs: ScientificFormatArgs = {
          format: -4,
        };
        const expectedValue = '1E-7';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          scientificArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1E-7 when value 1E-7 and total digits 5', () => {
        // Arrange
        const value = '1E-7';
        const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
        const formatArgs: ScientificFormatArgs = {
          format: -5,
        };
        const expectedValue = '1E-7';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          scientificArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.23E-10 when value 0.0000000001234 and total digits 5', () => {
        // Arrange
        const value = '0.0000000001234';
        const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
        const formatArgs: ScientificFormatArgs = {
          format: -5,
        };
        const expectedValue = '1.23E-10';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          scientificArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.23E-10 when value 1.234E-10 and total digits 5', () => {
        // Arrange
        const value = '1.234E-10';
        const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
        const formatArgs: ScientificFormatArgs = {
          format: -5,
        };
        const expectedValue = '1.23E-10';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          scientificArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.23E15 when value 1230000000000000 and total digits 5', () => {
        // Arrange
        const value = '1230000000000000';
        const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
        const formatArgs: ScientificFormatArgs = {
          format: -5,
        };
        const expectedValue = '1.23E15';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          scientificArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.23E15 when value 1.23E15 and total digits 5', () => {
        // Arrange
        const value = '1.23E15';
        const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
        const formatArgs: ScientificFormatArgs = {
          format: -5,
        };
        const expectedValue = '1.23E15';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          scientificArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.24E15 when value 1234500000000000 and total digits 5', () => {
        // Arrange
        const value = '1234500000000000';
        const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
        const formatArgs: ScientificFormatArgs = {
          format: -5,
        };
        const expectedValue = '1.23E15';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          scientificArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.24E15 when value 1.2345E15 and total digits 5', () => {
        // Arrange
        const value = '1.2345E15';
        const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
        const formatArgs: ScientificFormatArgs = {
          format: -5,
        };
        const expectedValue = '1.23E15';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          scientificArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
    });

    it('should return same number passed value when float value 123.11 passed and any format precision used', () => {
      // Arrange
      const value = '123.11';
      const format = FormatType.FORMAT_TYPE_SCIENTIFIC;
      const formatArgs: ScientificFormatArgs = {
        format: 'K',
      };
      const expectedValue = '123.11';

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
        useThousandsSeparator: false,
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
        useThousandsSeparator: false,
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
    it('should return number 12,300.000% when value 123 passed with 3 decimal digits arg passed and thousand comma', () => {
      // Arrange
      const value = '123';
      const format = FormatType.FORMAT_TYPE_PERCENTAGE;
      const formatArgs: PercentageFormatArgs = {
        useThousandsSeparator: true,
        format: 3,
      };
      const expectedValue = '12,300.000%';

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
      const formatArgs: PercentageFormatArgs = {
        useThousandsSeparator: false,
        format: 3,
      };
      const expectedValue = '12311.000%';

      // Act
      const displayValue = formatValue(value, {
        type: format,
        percentageArgs: formatArgs,
      });

      // Assert
      expect(displayValue).toEqual(expectedValue);
    });

    describe('Total digits', () => {
      it('should return number 1235K% when value 12345 and total digits -2 is more than minimum of -4', () => {
        // Arrange
        const value = '12345';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: -2,
        };
        const expectedValue = '1235K%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1200% when value 12 and total digits 5', () => {
        // Arrange
        const value = '12';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '1200%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 123.4K% when value 1234 and total digits 5', () => {
        // Arrange
        const value = '1234';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '123.4K%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1234.5K% when value 12345 and total digits 5', () => {
        // Arrange
        const value = '12345';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '1234.5K%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 12.346M% when value 123456 and total digits 4', () => {
        // Arrange
        const value = '123456';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: -4,
        };
        const expectedValue = '12.35M%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 42% when value 0.42 and total digits 5', () => {
        // Arrange
        const value = '0.42';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '42%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 4.2% when value 0.042 and total digits 5', () => {
        // Arrange
        const value = '0.042';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '4.2%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 0.0423% when value 0.000423 and total digits 5', () => {
        // Arrange
        const value = '0.000423';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '0.0423%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 0.0424% when value 0.0004235 and total digits 5', () => {
        // Arrange
        const value = '0.0004235';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '0.0424%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1E-5% when value 0.0000001 and total digits 5', () => {
        // Arrange
        const value = '0.0000001';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: -4,
        };
        const expectedValue = '1E-5%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1E-5% when value 1E-7 and total digits 5', () => {
        // Arrange
        const value = '1E-7';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '1E-5%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.234E-5% when value 0.0000001234 and total digits 5', () => {
        // Arrange
        const value = '0.0000001234';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '1.234E-5%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.234E-5% when value 1.234E-7 and total digits 5', () => {
        // Arrange
        const value = '1.234E-7';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '1.234E-5%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.235E-5% when value 0.00000012346 and total digits 5', () => {
        // Arrange
        const value = '0.00000012346';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '1.235E-5%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.235E-5% when value 1.2346E-7 and total digits 5', () => {
        // Arrange
        const value = '1.2367E-7';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '1.237E-5%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.23E17% when value 1230000000000000 and total digits 5', () => {
        // Arrange
        const value = '1230000000000000';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '1.23E17%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number 1.23E17% when value 1.23E15 and total digits 5', () => {
        // Arrange
        const value = '1.23E15';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: -5,
        };
        const expectedValue = '1.23E17%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });

      describe('Jumps between different total digits formats', () => {
        it('should return number 1000000000% when value 10 000 000 and total digits 10', () => {
          // Arrange
          const value = '10000000';
          const format = FormatType.FORMAT_TYPE_PERCENTAGE;
          const formatArgs: PercentageFormatArgs = {
            useThousandsSeparator: false,
            format: -10,
          };
          const expectedValue = '1000000000%';

          // Act
          const displayValue = formatValue(value, {
            type: format,
            percentageArgs: formatArgs,
          });

          // Assert
          expect(displayValue).toEqual(expectedValue);
        });
        it('should return number 1000000%K when value 10 000 000 and total digits 9', () => {
          // Arrange
          const value = '10000000';
          const format = FormatType.FORMAT_TYPE_PERCENTAGE;
          const formatArgs: PercentageFormatArgs = {
            useThousandsSeparator: false,
            format: -9,
          };
          const expectedValue = '1000000K%';

          // Act
          const displayValue = formatValue(value, {
            type: format,
            percentageArgs: formatArgs,
          });

          // Assert
          expect(displayValue).toEqual(expectedValue);
        });
        it('should return number 1000%M when value 10 000 000 and total digits 6', () => {
          // Arrange
          const value = '10000000';
          const format = FormatType.FORMAT_TYPE_PERCENTAGE;
          const formatArgs: PercentageFormatArgs = {
            useThousandsSeparator: false,
            format: -6,
          };
          const expectedValue = '1000M%';

          // Act
          const displayValue = formatValue(value, {
            type: format,
            percentageArgs: formatArgs,
          });

          // Assert
          expect(displayValue).toEqual(expectedValue);
        });
        it('should return number 1000$M when value 10 000 000 and total digits 4', () => {
          // Arrange
          const value = '10000000';
          const format = FormatType.FORMAT_TYPE_PERCENTAGE;
          const formatArgs: PercentageFormatArgs = {
            useThousandsSeparator: false,
            format: -4,
          };
          const expectedValue = '1000M%';

          // Act
          const displayValue = formatValue(value, {
            type: format,
            percentageArgs: formatArgs,
          });

          // Assert
          expect(displayValue).toEqual(expectedValue);
        });
        it('should return number 1000%B when value 10000000000 and total digits 4', () => {
          // Arrange
          const value = '10000000000';
          const format = FormatType.FORMAT_TYPE_PERCENTAGE;
          const formatArgs: PercentageFormatArgs = {
            useThousandsSeparator: false,
            format: -4,
          };
          const expectedValue = '1000B%';

          // Act
          const displayValue = formatValue(value, {
            type: format,
            percentageArgs: formatArgs,
          });

          // Assert
          expect(displayValue).toEqual(expectedValue);
        });
        it('should return number 1000%B when value 10000000000 and total digits 4', () => {
          // Arrange
          const value = '10000000000';
          const format = FormatType.FORMAT_TYPE_PERCENTAGE;
          const formatArgs: PercentageFormatArgs = {
            useThousandsSeparator: false,
            format: -4,
          };
          const expectedValue = '1000B%';

          // Act
          const displayValue = formatValue(value, {
            type: format,
            percentageArgs: formatArgs,
          });

          // Assert
          expect(displayValue).toEqual(expectedValue);
        });
        it('should return number 1E15% when value 10000000000000 and total digits 4', () => {
          // Arrange
          const value = '10000000000000';
          const format = FormatType.FORMAT_TYPE_PERCENTAGE;
          const formatArgs: PercentageFormatArgs = {
            useThousandsSeparator: false,
            format: -4,
          };
          const expectedValue = '1E15%';

          // Act
          const displayValue = formatValue(value, {
            type: format,
            percentageArgs: formatArgs,
          });

          // Assert
          expect(displayValue).toEqual(expectedValue);
        });
      });
    });

    describe('Compact precision', () => {
      it('should return 0K% when value 0 passed and K format precision used', () => {
        // Arrange
        const value = '0';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: 'K',
        };
        const expectedValue = '0K%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return 0K% when value 1 passed and K format precision used', () => {
        // Arrange
        const value = '1';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: 'K',
        };
        const expectedValue = '0K%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return 0.1K% when float value 123.11 passed and K format precision used', () => {
        // Arrange
        const value = '123.11';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: 'K',
        };
        const expectedValue = '0.1K%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return 123.5K% when float value 123456 passed and K format precision used', () => {
        // Arrange
        const value = '123456';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: 'K',
        };
        const expectedValue = '123.5K%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return 0.1M% when float value 123456 passed and M format precision used', () => {
        // Arrange
        const value = '123456';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: 'M',
        };
        const expectedValue = '0.1M%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });

      it('should return 123.5M% when float value 123456789 passed and M format precision used', () => {
        // Arrange
        const value = '123456789';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: 'M',
        };
        const expectedValue = '123.5M%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });

      it('should return 0.1B% when float value 123456789 passed and B format precision used', () => {
        // Arrange
        const value = '123456789';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: 'B',
        };
        const expectedValue = '0.1B%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });

      it('should return 123.5B% when float value 123456789999 passed and B format precision used', () => {
        // Arrange
        const value = '123456789999';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          useThousandsSeparator: false,
          format: 'B',
        };
        const expectedValue = '123.5B%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return 100,000%K when float value 1000000 passed and K format precision used and thousand comma', () => {
        // Arrange
        const value = '1000000';
        const format = FormatType.FORMAT_TYPE_PERCENTAGE;
        const formatArgs: PercentageFormatArgs = {
          format: 'K',
          useThousandsSeparator: true,
        };
        const expectedValue = '1,000K%';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          percentageArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
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
    describe('Total digits', () => {
      it("should return number '$ 123.5K' when value 1234 with symbol `$` and total digits -2 is more than minimum of -4", () => {
        // Arrange
        const value = '12345';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          useThousandsSeparator: false,
          symbol: '$',
          format: -2,
        };
        const expectedValue = '$ 12.35K';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it("should return number '$ 12' when value 12  with symbol `$` and total digits 5", () => {
        // Arrange
        const value = '12';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          useThousandsSeparator: false,
          symbol: '$',
          format: -5,
        };
        const expectedValue = '$ 12';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it("should return number '$ 1234' when value 1234  with symbol `$` and total digits 5", () => {
        // Arrange
        const value = '1234';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          useThousandsSeparator: false,
          symbol: '$',
          format: -5,
        };
        const expectedValue = '$ 1234';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it("should return number '$ 12345' when value 12345  with symbol `$` and total digits 5", () => {
        // Arrange
        const value = '12345';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          useThousandsSeparator: false,
          symbol: '$',
          format: -5,
        };
        const expectedValue = '$ 12345';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it("should return number '$ 123.46K' when value 123456  with symbol `$` and total digits 5", () => {
        // Arrange
        const value = '123456';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          useThousandsSeparator: false,
          symbol: '$',
          format: -5,
        };
        const expectedValue = '$ 123.46K';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return number $ 1,000K when value 1000000 and total digits 4 and thousand operator presented', () => {
        // Arrange
        const value = '1000000';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          symbol: '$',
          useThousandsSeparator: true,
          format: -4,
        };
        const expectedValue = '$ 1,000K';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it("should return number '$ 0.42' when value 0.42  with symbol `$` and total digits 5", () => {
        // Arrange
        const value = '0.42';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          useThousandsSeparator: false,
          symbol: '$',
          format: -5,
        };
        const expectedValue = '$ 0.42';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it("should return number '$ 0.042' when value 0.042  with symbol `$` and total digits 5", () => {
        // Arrange
        const value = '0.042';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          useThousandsSeparator: false,
          symbol: '$',
          format: -5,
        };
        const expectedValue = '$ 0.042';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it("should return number '$ 0.0423' when value 0.0423  with symbol `$` and total digits 5", () => {
        // Arrange
        const value = '0.0423';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          useThousandsSeparator: false,
          symbol: '$',
          format: -5,
        };
        const expectedValue = '$ 0.0423';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it("should return number '$ 0.0424' when value 0.04235  with symbol `$` and total digits 5", () => {
        // Arrange
        const value = '0.04235';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          useThousandsSeparator: false,
          symbol: '$',
          format: -5,
        };
        const expectedValue = '$ 0.0424';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it("should return number '$ 1E-7' when value 0.0000001  with symbol `$` and total digits 5", () => {
        // Arrange
        const value = '0.0000001';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          useThousandsSeparator: false,
          symbol: '$',
          format: -4,
        };
        const expectedValue = '$ 1E-7';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it("should return number '$ 1E-7' when value 1E-7  with symbol `$` and total digits 5", () => {
        // Arrange
        const value = '1E-7';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          useThousandsSeparator: false,
          symbol: '$',
          format: -5,
        };
        const expectedValue = '$ 1E-7';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it("should return number '$ 1.234E-7' when value 0.0000001234  with symbol `$` and total digits 5", () => {
        // Arrange
        const value = '0.0000001234';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          useThousandsSeparator: false,
          symbol: '$',
          format: -5,
        };
        const expectedValue = '$ 1.234E-7';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it("should return number '$ 1.234E-7' when value 1.234E-7  with symbol `$` and total digits 5", () => {
        // Arrange
        const value = '1.234E-7';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          useThousandsSeparator: false,
          symbol: '$',
          format: -5,
        };
        const expectedValue = '$ 1.234E-7';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it("should return number '$ 1.235E-7' when value 0.00000012346  with symbol `$` and total digits 5", () => {
        // Arrange
        const value = '0.00000012346';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          useThousandsSeparator: false,
          symbol: '$',
          format: -5,
        };
        const expectedValue = '$ 1.235E-7';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it("should return number '$ 1.235E-7' when value 1.2346E-7  with symbol `$` and total digits 5", () => {
        // Arrange
        const value = '1.2367E-7';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          useThousandsSeparator: false,
          symbol: '$',
          format: -5,
        };
        const expectedValue = '$ 1.237E-7';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it("should return number '$ 1.23E15' when value 1230000000000000  with symbol `$` and total digits 5", () => {
        // Arrange
        const value = '1230000000000000';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          useThousandsSeparator: false,
          symbol: '$',
          format: -5,
        };
        const expectedValue = '$ 1.23E15';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it("should return number '$ 1.23E15' when value 1.23E15  with symbol `$` and total digits 5", () => {
        // Arrange
        const value = '1.23E15';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          useThousandsSeparator: false,
          symbol: '$',
          format: -5,
        };
        const expectedValue = '$ 1.23E15';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });

      describe('Jumps between different total digits formats', () => {
        it('should return number $ 1000000000 when value 1 000 000 000 and total digits 10', () => {
          // Arrange
          const value = '1000000000';
          const format = FormatType.FORMAT_TYPE_CURRENCY;
          const formatArgs: CurrencyFormatArgs = {
            symbol: '$',
            useThousandsSeparator: false,
            format: -10,
          };
          const expectedValue = '$ 1000000000';

          // Act
          const displayValue = formatValue(value, {
            type: format,
            currencyArgs: formatArgs,
          });

          // Assert
          expect(displayValue).toEqual(expectedValue);
        });
        it('should return number $ 1000000K when value 1 000 000 000 and total digits 9', () => {
          // Arrange
          const value = '1000000000';
          const format = FormatType.FORMAT_TYPE_CURRENCY;
          const formatArgs: CurrencyFormatArgs = {
            symbol: '$',
            useThousandsSeparator: false,
            format: -9,
          };
          const expectedValue = '$ 1000000K';

          // Act
          const displayValue = formatValue(value, {
            type: format,
            currencyArgs: formatArgs,
          });

          // Assert
          expect(displayValue).toEqual(expectedValue);
        });
        it('should return number $ 1000M when value 1 000 000 000 and total digits 6', () => {
          // Arrange
          const value = '1000000000';
          const format = FormatType.FORMAT_TYPE_CURRENCY;
          const formatArgs: CurrencyFormatArgs = {
            symbol: '$',
            useThousandsSeparator: false,
            format: -6,
          };
          const expectedValue = '$ 1000M';

          // Act
          const displayValue = formatValue(value, {
            type: format,
            currencyArgs: formatArgs,
          });

          // Assert
          expect(displayValue).toEqual(expectedValue);
        });
        it('should return number $ 1000M when value 1 000 000 000 and total digits 4', () => {
          // Arrange
          const value = '1000000000';
          const format = FormatType.FORMAT_TYPE_CURRENCY;
          const formatArgs: CurrencyFormatArgs = {
            symbol: '$',
            useThousandsSeparator: false,
            format: -4,
          };
          const expectedValue = '$ 1000M';

          // Act
          const displayValue = formatValue(value, {
            type: format,
            currencyArgs: formatArgs,
          });

          // Assert
          expect(displayValue).toEqual(expectedValue);
        });
        it('should return number $ 1000B when value 1 000 000 000 000 and total digits 4', () => {
          // Arrange
          const value = '1000000000000';
          const format = FormatType.FORMAT_TYPE_CURRENCY;
          const formatArgs: CurrencyFormatArgs = {
            symbol: '$',
            useThousandsSeparator: false,
            format: -4,
          };
          const expectedValue = '$ 1000B';

          // Act
          const displayValue = formatValue(value, {
            type: format,
            currencyArgs: formatArgs,
          });

          // Assert
          expect(displayValue).toEqual(expectedValue);
        });
        it('should return number $ 1000B when value 1 000 000 000 000 and total digits 4', () => {
          // Arrange
          const value = '1000000000000';
          const format = FormatType.FORMAT_TYPE_CURRENCY;
          const formatArgs: CurrencyFormatArgs = {
            symbol: '$',
            useThousandsSeparator: false,
            format: -4,
          };
          const expectedValue = '$ 1000B';

          // Act
          const displayValue = formatValue(value, {
            type: format,
            currencyArgs: formatArgs,
          });

          // Assert
          expect(displayValue).toEqual(expectedValue);
        });
        it('should return number $ 1E15 when value 1 000 000 000 000 000 and total digits 4', () => {
          // Arrange
          const value = '1000000000000000';
          const format = FormatType.FORMAT_TYPE_CURRENCY;
          const formatArgs: CurrencyFormatArgs = {
            symbol: '$',
            useThousandsSeparator: false,
            format: -4,
          };
          const expectedValue = '$ 1E15';

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

    describe('Compact precision', () => {
      it('should return `$ 0K` when value 0 passed and K format precision used', () => {
        // Arrange
        const value = '0';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          format: 'K',
          useThousandsSeparator: false,
          symbol: '$',
        };
        const expectedValue = '$ 0K';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return `$ 0K` when value 1 passed and K format precision used', () => {
        // Arrange
        const value = '1';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          format: 'K',
          useThousandsSeparator: false,
          symbol: '$',
        };
        const expectedValue = '$ 0K';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return `$ 0.1K` when float value 123.11 passed and K format precision used', () => {
        // Arrange
        const value = '123.11';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          format: 'K',
          useThousandsSeparator: false,
          symbol: '$',
        };
        const expectedValue = '$ 0.1K';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return `$ 123.5K` when float value 123456 passed and K format precision used', () => {
        // Arrange
        const value = '123456';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          format: 'K',
          useThousandsSeparator: false,
          symbol: '$',
        };
        const expectedValue = '$ 123.5K';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });
      it('should return `$ 0.1M` when float value 123456 passed and M format precision used', () => {
        // Arrange
        const value = '123456';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          format: 'M',
          useThousandsSeparator: false,
          symbol: '$',
        };
        const expectedValue = '$ 0.1M';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });

      it('should return `$ 123.5M` when float value 123456789 passed and M format precision used', () => {
        // Arrange
        const value = '123456789';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          format: 'M',
          useThousandsSeparator: false,
          symbol: '$',
        };
        const expectedValue = '$ 123.5M';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });

      it('should return `$ 0.1B` when float value 123456789 passed and B format precision used', () => {
        // Arrange
        const value = '123456789';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          format: 'B',
          useThousandsSeparator: false,
          symbol: '$',
        };
        const expectedValue = '$ 0.1B';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });

      it('should return `$ 123.5B` when float value 123456789999 passed and B format precision used', () => {
        // Arrange
        const value = '123456789999';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          format: 'B',
          useThousandsSeparator: false,
          symbol: '$',
        };
        const expectedValue = '$ 123.5B';

        // Act
        const displayValue = formatValue(value, {
          type: format,
          currencyArgs: formatArgs,
        });

        // Assert
        expect(displayValue).toEqual(expectedValue);
      });

      it('should return $ 1,000K when float value 1000000 passed and K format precision used and thousand comma', () => {
        // Arrange
        const value = '1000000';
        const format = FormatType.FORMAT_TYPE_CURRENCY;
        const formatArgs: CurrencyFormatArgs = {
          symbol: '$',
          format: 'K',
          useThousandsSeparator: true,
        };
        const expectedValue = '$ 1,000K';

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
});
