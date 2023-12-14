package com.epam.deltix.quantgrid.engine.value.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;

public class DoubleDirectColumn implements DoubleColumn {

    private final DoubleArrayList values;

    public DoubleDirectColumn(double... array) {
        this.values = DoubleArrayList.of(array);
    }

    public DoubleDirectColumn(DoubleArrayList list) {
        this.values = list;
    }

    @Override
    public long size() {
        return values.size();
    }

    @Override
    public double get(long index) {
        return values.getDouble(Util.toIntIndex(index));
    }

    @Override
    public double[] toArray() {
        if (values.size() == values.elements().length) {
            return values.elements();
        } else {
            return values.toDoubleArray();
        }
    }
}