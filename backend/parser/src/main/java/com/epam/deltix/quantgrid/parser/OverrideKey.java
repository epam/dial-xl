package com.epam.deltix.quantgrid.parser;

/**
 * @param table - table name where override is defined.
 * @param field - field name which override is defined for.
 * @param position - row number starting from 1 where override is defined in.
 */
public record OverrideKey(String table, String field, int position) implements ParsedKey {
    @Override
    public String toString() {
        return table + "[" + field + "](" + position + ")";
    }
}