package com.epam.quantgrid.input.snowflake;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SnowflakeInputTest {
    @Test
    void testQuery() {
        SnowflakeInput snowflakeInput = new SnowflakeInput();
        String expected = """
                select "COLUMN-1","COLUMN""2" from "MY-DB"."PUBLIC"."TAB""LE\"""";

        String actual = snowflakeInput.buildQuery("MY-DB/PUBLIC/TAB\"LE", List.of("COLUMN-1", "COLUMN\"2"));

        assertThat(actual).isEqualTo(expected);
    }
}