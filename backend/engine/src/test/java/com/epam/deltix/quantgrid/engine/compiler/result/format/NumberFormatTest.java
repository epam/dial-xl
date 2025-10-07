package com.epam.deltix.quantgrid.engine.compiler.result.format;

import com.epam.deltix.quantgrid.util.Formatter;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class NumberFormatTest {
    public static final List<Double> INPUTS = List.of(
            0D,
            -0D,
            1D,
            1.5,
            1234.567,
            9.999,
            123456789123456789.123456789,
            -123.456,
            1.234,
            1e-30,
            1e30,
            -1e29,
            Double.MAX_VALUE,
            Double.POSITIVE_INFINITY);

    @Test
    void testFormatWithDecimalPoint() {
        String[] expected = new String[] {
                "0.00",
                "0.00",
                "1.00",
                "1.50",
                "1,234.57",
                "10.00",
                "123,456,789,123,456,800.00",
                "-123.46",
                "1.23",
                "0.00",
                "1,000,000,000,000,000,000,000,000,000,000.00",
                "-99,999,999,999,999,990,000,000,000,000.00",
                "179,769,313,486,231,600" + ",000".repeat(97) + ".00",
                null
        };
        Formatter formatter = new NumberFormat("2", true).createFormatter();

        String[] actual = INPUTS.stream()
                .map(formatter::apply)
                .toArray(String[]::new);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testFormatWithoutDecimalPoint() {
        String[] expected = new String[] {
                "0",
                "0",
                "1",
                "2",
                "1,235",
                "10",
                "123,456,789,123,456,800",
                "-123",
                "1",
                "0",
                "1,000,000,000,000,000,000,000,000,000,000",
                "-99,999,999,999,999,990,000,000,000,000",
                "179,769,313,486,231,600" + ",000".repeat(97),
                null
        };
        Formatter formatter = new NumberFormat("0", true).createFormatter();

        String[] actual = INPUTS.stream()
                .map(formatter::apply)
                .toArray(String[]::new);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testFormatWithMultiplier() {
        String[] expected = new String[] {
                "0K",
                "0K",
                "0K",
                "0K",
                "1.2K",
                "0K",
                "123,456,789,123,456.8K",
                "-0.1K",
                "0K",
                "0K",
                "1,000,000,000,000,000,000,000,000,000K",
                "-99,999,999,999,999,990,000,000,000K",
                "179,769,313,486,231,600" + ",000".repeat(96) + "K",
                null
        };
        Formatter formatter = new NumberFormat("K", true).createFormatter();

        String[] actual = INPUTS.stream()
                .map(formatter::apply)
                .toArray(String[]::new);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testFormatWithTotalDigits() {
        String[] expected = new String[] {
                "0",
                "0",
                "1",
                "1.5",
                "1,234.6",
                "9.999",
                "1.23E17",
                "-123.46",
                "1.234",
                "1E-30",
                "1E30",
                "-1E29",
                "1.8E308",
                null
        };
        Formatter formatter = new NumberFormat("-5", true).createFormatter();

        String[] actual = INPUTS.stream()
                .map(formatter::apply)
                .toArray(String[]::new);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testFormatWithTotalDigitsTransitions() {
        Map<Double, String> map = new LinkedHashMap<>();
        map.put(1.23e-10, "1.2E-10");
        map.put(1.235e-4, "1.24E-4");
        map.put(0.0009999, "0.001");
        map.put(0.0012, "0.001");
        map.put(0.01, "0.01");
        map.put(1234.5, "1,235");
        map.put(9999.9, "10K");
        map.put(12345.0, "12.4K");
        map.put(9999900.0, "10M");
        map.put(12345678.0, "12.35M");
        map.put(9.9999e11, "1,000B");
        map.put(9.9999e12, "1E13");
        map.put(9.99e99, "1E100");
        Formatter formatter = new NumberFormat("-4", true).createFormatter();

        List<String> actual = map.keySet().stream()
                .map(formatter::apply)
                .toList();
        List<String> expected = new ArrayList<>(map.values());

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testMerge() {
        List<NumberFormat> left = List.of(
                new NumberFormat("1", true),
                new NumberFormat("-1", false),
                new NumberFormat("-1", false),
                new NumberFormat("K", true),
                new NumberFormat("B", true));
        List<NumberFormat> right = List.of(
                new NumberFormat("2", false),
                new NumberFormat("1", true),
                new NumberFormat("-2", false),
                new NumberFormat("M", true),
                new NumberFormat("-3", true));
        List<NumberFormat> expected = List.of(
                new NumberFormat("2", true),
                new NumberFormat("1", true),
                new NumberFormat("-2", false),
                new NumberFormat("K", true),
                new NumberFormat("-3", true));

        List<ColumnFormat> actual = IntStream.range(0, left.size())
                .mapToObj(i -> left.get(i).merge(right.get(i)))
                .toList();

        assertThat(actual).isEqualTo(expected);
    }
}