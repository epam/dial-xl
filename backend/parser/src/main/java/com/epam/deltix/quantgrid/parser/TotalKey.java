package com.epam.deltix.quantgrid.parser;

public record TotalKey(String table, String field, int number) implements ParsedKey {
    @Override
    public String toString() {
        return "Total(" + table + "[" + field + "], " + number + ")";
    }
}