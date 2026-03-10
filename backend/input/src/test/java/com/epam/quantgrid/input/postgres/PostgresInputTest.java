package com.epam.quantgrid.input.postgres;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PostgresInputTest {
    @Test
    void testQuery() {
        PostgresInput snowflakeInput = new PostgresInput();
        String expected = """
                select "COLUMN-1","COLUMN""2" from "MY-DB"."PUBLIC"."TAB""LE\"""";

        String actual = snowflakeInput.buildQuery("MY-DB/PUBLIC/TAB\"LE", List.of("COLUMN-1", "COLUMN\"2"));

        assertThat(actual).isEqualTo(expected);
    }
}