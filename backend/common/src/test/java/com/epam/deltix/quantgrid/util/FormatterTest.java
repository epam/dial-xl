package com.epam.deltix.quantgrid.util;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class FormatterTest {
    @Test
    void testLosslessFormat() {
        List<Double> input = List.of(0.0, -0.0, 1.0, -1.0, 9e6, 1e7, -1e7, 1e-4);
        List<String> expected = List.of("0", "0", "1", "-1", "9000000", "1.0E7", "-1.0E7", "1.0E-4");

        List<String> actual = input.stream()
                .map(Formatter.LOSSLESS::apply)
                .toList();

        assertThat(actual).isEqualTo(expected);
    }
}