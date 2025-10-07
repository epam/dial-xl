package com.epam.deltix.quantgrid.engine.compiler.result.format;

import com.epam.deltix.quantgrid.util.Formatter;
import com.epam.deltix.quantgrid.util.Strings;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.stream.IntStream;

import static com.epam.deltix.quantgrid.engine.compiler.result.format.NumberFormatTest.INPUTS;
import static org.assertj.core.api.Assertions.assertThat;

class CurrencyFormatTest {
    @Test
    void testFormatWithDecimalPoint() {
        String[] expected = new String[] {
                "$ 0.00",
                "$ 0.00",
                "$ 1.00",
                "$ 1.50",
                "$ 1,234.57",
                "$ 10.00",
                "$ 123,456,789,123,456,800.00",
                "$ -123.46",
                "$ 1.23",
                "$ 0.00",
                "$ 1,000,000,000,000,000,000,000,000,000,000.00",
                "$ -99,999,999,999,999,990,000,000,000,000.00",
                "$ 179,769,313,486,231,600" + ",000".repeat(97) + ".00",
                Strings.ERROR_NA
        };
        Formatter formatter = new CurrencyFormat("2", true, "$").createFormatter();

        String[] actual = INPUTS.stream()
                .map(formatter::apply)
                .toArray(String[]::new);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testFormatWithoutDecimalPoint() {
        String[] expected = new String[] {
                "$ 0",
                "$ 0",
                "$ 1",
                "$ 2",
                "$ 1,235",
                "$ 10",
                "$ 123,456,789,123,456,800",
                "$ -123",
                "$ 1",
                "$ 0",
                "$ 1,000,000,000,000,000,000,000,000,000,000",
                "$ -99,999,999,999,999,990,000,000,000,000",
                "$ 179,769,313,486,231,600" + ",000".repeat(97),
                Strings.ERROR_NA
        };
        Formatter formatter = new CurrencyFormat("0", true, "$").createFormatter();

        String[] actual = INPUTS.stream()
                .map(formatter::apply)
                .toArray(String[]::new);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testFormatWithMultiplier() {
        String[] expected = new String[] {
                "$ 0K",
                "$ 0K",
                "$ 0K",
                "$ 0K",
                "$ 1.2K",
                "$ 0K",
                "$ 123,456,789,123,456.8K",
                "$ -0.1K",
                "$ 0K",
                "$ 0K",
                "$ 1,000,000,000,000,000,000,000,000,000K",
                "$ -99,999,999,999,999,990,000,000,000K",
                "$ 179,769,313,486,231,600" + ",000".repeat(96) + "K",
                null
        };
        Formatter formatter = new CurrencyFormat("K", true, "$").createFormatter();

        String[] actual = INPUTS.stream()
                .map(formatter::apply)
                .toArray(String[]::new);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testFormatWithTotalDigits() {
        String[] expected = new String[] {
                "$ 0",
                "$ 0",
                "$ 1",
                "$ 1.5",
                "$ 1,234.6",
                "$ 9.999",
                "$ 1.23E17",
                "$ -123.46",
                "$ 1.234",
                "$ 1E-30",
                "$ 1E30",
                "$ -1E29",
                "$ 1.8E308",
                null
        };
        Formatter formatter = new CurrencyFormat("-5", true, "$").createFormatter();

        String[] actual = INPUTS.stream()
                .map(formatter::apply)
                .toArray(String[]::new);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testMerge() {
        List<CurrencyFormat> left = List.of(
                new CurrencyFormat("1", true, "$"),
                new CurrencyFormat("-1", false, "$"),
                new CurrencyFormat("-1", false, "$"),
                new CurrencyFormat("K", true, "$"),
                new CurrencyFormat("B", true, "$"));
        List<CurrencyFormat> right = List.of(
                new CurrencyFormat("2", false, "£"),
                new CurrencyFormat("1", true, "£"),
                new CurrencyFormat("-2", false, "£"),
                new CurrencyFormat("M", true, "£"),
                new CurrencyFormat("-3", true, "£"));
        List<CurrencyFormat> expected = List.of(
                new CurrencyFormat("2", true, "$"),
                new CurrencyFormat("1", true, "$"),
                new CurrencyFormat("-2", false, "$"),
                new CurrencyFormat("K", true, "$"),
                new CurrencyFormat("-3", true, "$"));

        List<ColumnFormat> actual = IntStream.range(0, left.size())
                .mapToObj(i -> left.get(i).merge(right.get(i)))
                .toList();

        assertThat(actual).isEqualTo(expected);
    }
}