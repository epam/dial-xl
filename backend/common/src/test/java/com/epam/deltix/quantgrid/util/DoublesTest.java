package com.epam.deltix.quantgrid.util;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class DoublesTest {
    @Test
    void testParseDoubleWithCommas() {
        List<String> inputs = List.of("1,234", "12,345", "123,456", "+123,456", "123,456B", "-1,234,567.89");
        List<Double> expected = List.of(1234.0, 12345.0, 123456.0, 123456.0, 1.23456e14, -1234567.89);
        List<Double> actual = inputs.stream()
                .map(Doubles::parseDouble)
                .toList();

        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void testParseDoubleWithIncorrectCommas() {
        List<String> inputs = List.of(",123456", "12,,345", "12,3,456", "123456,", "1,234567.89");
        List<Double> actual = inputs.stream()
                .map(Doubles::parseDouble)
                .toList();

        assertThat(actual).containsOnly(Double.NaN);
    }

    @Test
    void testParseDoubleWithoutCommas() {
        List<String> inputs = List.of("+1234", "0", "1234.567", "-1234M");
        List<Double> expected = List.of(1234.0, 0.0, 1234.567, -1.234E9);
        List<Double> actual = inputs.stream()
                .map(Doubles::parseDouble)
                .toList();

        assertThat(actual).isEqualTo(expected);
    }
}