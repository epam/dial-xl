package com.epam.deltix.quantgrid.engine.compiler.result.format;

import com.epam.deltix.quantgrid.util.Formatter;
import com.epam.deltix.quantgrid.util.Strings;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.stream.IntStream;

import static com.epam.deltix.quantgrid.engine.compiler.result.format.NumberFormatTest.INPUTS;
import static org.assertj.core.api.Assertions.assertThat;

class PercentageFormatTest {
    @Test
    void testFormatWithDecimalPoint() {
        String[] expected = new String[] {
                "0.00%",
                "0.00%",
                "100.00%",
                "150.00%",
                "123,456.70%",
                "999.90%",
                "12,345,678,912,345,680,000.00%",
                "-12,345.60%",
                "123.40%",
                "0.00%",
                "100,000,000,000,000,000,000,000,000,000,000.00%",
                "-10,000,000,000,000,000,000,000,000,000,000.00%",
                Strings.ERROR_NA,
                Strings.ERROR_NA
        };
        Formatter formatter = new PercentageFormat("2", true).createFormatter();

        String[] actual = INPUTS.stream()
                .map(formatter::apply)
                .toArray(String[]::new);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testFormatWithoutDecimalPoint() {
        String[] expected = new String[] {
                "0%",
                "0%",
                "100%",
                "150%",
                "123,457%",
                "1,000%",
                "12,345,678,912,345,680,000%",
                "-12,346%",
                "123%",
                "0%",
                "100,000,000,000,000,000,000,000,000,000,000%",
                "-10,000,000,000,000,000,000,000,000,000,000%",
                Strings.ERROR_NA,
                Strings.ERROR_NA
        };
        Formatter formatter = new PercentageFormat("0", true).createFormatter();

        String[] actual = INPUTS.stream()
                .map(formatter::apply)
                .toArray(String[]::new);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testFormatWithMultiplier() {
        String[] expected = new String[] {
                "0%",
                "0%",
                "0.1K%",
                "0.2K%",
                "123.5K%",
                "1K%",
                "12,345,678,912,345,680K%",
                "-12.3K%",
                "0.1K%",
                "0%",
                "100,000,000,000,000,000,000,000,000,000K%",
                "-10,000,000,000,000,000,000,000,000,000K%",
                null,
                null
        };
        Formatter formatter = new PercentageFormat("K", true).createFormatter();

        String[] actual = INPUTS.stream()
                .map(formatter::apply)
                .toArray(String[]::new);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testFormatWithTotalDigits() {
        String[] expected = new String[] {
                "0%",
                "0%",
                "100%",
                "150%",
                "123.5K%",
                "999.9%",
                "1.23E+19%",
                "-12,346%",
                "123.4%",
                "1E-28%",
                "1E+32%",
                "-1E+31%",
                null,
                null
        };
        Formatter formatter = new PercentageFormat("-5", true).createFormatter();

        String[] actual = INPUTS.stream()
                .map(formatter::apply)
                .toArray(String[]::new);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testMerge() {
        List<PercentageFormat> left = List.of(
                new PercentageFormat("1", true),
                new PercentageFormat("-1", false),
                new PercentageFormat("-1", false),
                new PercentageFormat("K", true),
                new PercentageFormat("B", true));
        List<PercentageFormat> right = List.of(
                new PercentageFormat("2", false),
                new PercentageFormat("1", true),
                new PercentageFormat("-2", false),
                new PercentageFormat("M", true),
                new PercentageFormat("-3", true));
        List<PercentageFormat> expected = List.of(
                new PercentageFormat("2", true),
                new PercentageFormat("1", true),
                new PercentageFormat("-2", false),
                new PercentageFormat("K", true),
                new PercentageFormat("-3", true));

        List<ColumnFormat> actual = IntStream.range(0, left.size())
                .mapToObj(i -> left.get(i).merge(right.get(i)))
                .toList();

        assertThat(actual).isEqualTo(expected);
    }
}