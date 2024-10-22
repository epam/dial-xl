package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.Util;
import lombok.EqualsAndHashCode;

import java.util.ArrayList;
import java.util.List;

@EqualsAndHashCode
public final class CompiledRow {

    private final List<Object> values = new ArrayList<>();

    public CompiledRow() {
    }

    public CompiledRow(double value) {
        add(value);
    }

    public CompiledRow(Object value) {
       add(value);
    }

    public int size() {
        return values.size();
    }

    public void add(Object value) {
        Util.verify(value instanceof String || value instanceof Double || value == null);
        values.add(value);
    }

    public boolean isDouble(int index) {
        return values.get(index) instanceof Double;
    }

    public double getDouble(int index) {
        return (Double) values.get(index);
    }

    public String getString(int index) {
        return (String) values.get(index);
    }
}