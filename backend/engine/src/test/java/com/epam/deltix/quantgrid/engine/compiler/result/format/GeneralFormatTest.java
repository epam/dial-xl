package com.epam.deltix.quantgrid.engine.compiler.result.format;

import com.epam.deltix.quantgrid.util.Formatter;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;


class GeneralFormatTest {
    @Test
    void testRounding() {
        Formatter formatter = GeneralFormat.INSTANCE.createFormatter();

        String actual = formatter.apply(999999.99999);

        assertThat(actual).isEqualTo("1,000,000");
    }

    @Test
    void testBillions() {
        Formatter formatter = GeneralFormat.INSTANCE.createFormatter();

        String actual = formatter.apply(1234567891234.0);
        assertThat(actual).isEqualTo("1,234.6B");

        actual = formatter.apply(9_999_999_999.4);
        assertThat(actual).isEqualTo("9,999,999,999");

        actual = formatter.apply(10_000_000_000.4);
        assertThat(actual).isEqualTo("10B");
    }

    @Test
    void testBigExponent() {
        Formatter formatter = GeneralFormat.INSTANCE.createFormatter();

        String actual = formatter.apply(123456789123456789.0);

        assertThat(actual).isEqualTo("1.2346E17");
    }

    @Test
    void testIntegerExponent() {
        Formatter formatter = GeneralFormat.INSTANCE.createFormatter();

        String actual = formatter.apply(1e18);

        assertThat(actual).isEqualTo("1E18");
    }

    @Test
    void testSmallExponent() {
        Formatter formatter = GeneralFormat.INSTANCE.createFormatter();

        String actual = formatter.apply(0.0000000123);

        assertThat(actual).isEqualTo("1.23E-8");
    }

    @Test
    void testFraction() {
        Formatter formatter = GeneralFormat.INSTANCE.createFormatter();

        String actual = formatter.apply(0.000000123);

        assertThat(actual).isEqualTo("0.000000123");
    }

    @Test
    void testInteger() {
        Formatter formatter = GeneralFormat.INSTANCE.createFormatter();

        String actual = formatter.apply(123);

        assertThat(actual).isEqualTo("123");
    }

    @Test
    void testRoundingError() {
        Formatter formatter = GeneralFormat.INSTANCE.createFormatter();

        String actual = formatter.apply(12345.67);

        assertThat(actual).isEqualTo("12,345.67");
    }

    @Test
    void testSpecialValues() {
        List<Double> inputs = List.of(
                0.0, -0.0, Double.MIN_VALUE, Double.MAX_VALUE, Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY);

        String[] expected = new String[] {
                "0", "0", "4.9407E-324", "1.7977E308", "-Infinity", "Infinity"
        };
        Formatter formatter = GeneralFormat.INSTANCE.createFormatter();

        String[] actual = inputs.stream()
                .map(formatter::apply)
                .toArray(String[]::new);

        assertThat(actual).isEqualTo(expected);
    }
}