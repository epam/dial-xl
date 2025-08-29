package com.epam.deltix.quantgrid.parser;

public record TableKey(String table) implements ParsedKey {
    @Override
    public String toString() {
        return table;
    }
}