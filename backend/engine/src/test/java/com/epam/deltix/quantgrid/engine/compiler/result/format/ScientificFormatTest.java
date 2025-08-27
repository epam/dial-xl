package com.epam.deltix.quantgrid.engine.compiler.result.format;

import com.epam.deltix.quantgrid.util.Formatter;
import com.epam.deltix.quantgrid.util.Strings;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class ScientificFormatTest {
    private static final List<Double> INPUTS = List.of(
            0.0,
            -0.0,
            1.0,
            9.999,
            1234.56,
            -1e-20,
            3.3456e30,
            Double.MIN_VALUE,
            Double.MAX_VALUE,
            Double.NEGATIVE_INFINITY);

    @Test
    void testFormatWithDecimalPoint() {
        String[] expected = new String[] {
                "0.00E+0",
                "0.00E+0",
                "1.00E+0",
                "1.00E+1",
                "1.23E+3",
                "-1.00E-20",
                "3.35E+30",
                "4.94E-324",
                "1.80E+308",
                Strings.ERROR_NA
        };
        Formatter formatter = new ScientificFormat(2).createFormatter();

        String[] actual = INPUTS.stream()
                .map(formatter::apply)
                .toArray(String[]::new);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testFormatWithoutDecimalPoint() {
        String[] expected = new String[] {
                "0E+0",
                "0E+0",
                "1E+0",
                "1E+1",
                "1E+3",
                "-1E-20",
                "3E+30",
                "5E-324",
                "2E+308",
                Strings.ERROR_NA
        };
        Formatter formatter = new ScientificFormat(0).createFormatter();

        String[] actual = INPUTS.stream()
                .map(formatter::apply)
                .toArray(String[]::new);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testFormatWithTotalDigits() {
        String[] expected = new String[] {
                "0E+0",
                "0E+0",
                "1E+0",
                "1E+1",
                "1.23E+3",
                "-1E-20",
                "3.3E+30",
                "5E-324",
                "2E+308",
                Strings.ERROR_NA
        };
        Formatter formatter = new ScientificFormat(-4).createFormatter();

        String[] actual = INPUTS.stream()
                .map(formatter::apply)
                .toArray(String[]::new);

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testMerge() {
        List<ScientificFormat> left = List.of(
                new ScientificFormat(1),
                new ScientificFormat(-1),
                new ScientificFormat(-1));
        List<ScientificFormat> right = List.of(
                new ScientificFormat(2),
                new ScientificFormat(1),
                new ScientificFormat(-2));
        List<ScientificFormat> expected = List.of(
                new ScientificFormat(2),
                new ScientificFormat(1),
                new ScientificFormat(-2));

        List<ColumnFormat> actual = IntStream.range(0, left.size())
                .mapToObj(i -> left.get(i).merge(right.get(i)))
                .toList();

        assertThat(actual).isEqualTo(expected);
    }
}