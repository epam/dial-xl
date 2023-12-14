package com.epam.deltix.quantgrid.engine.value;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;

public interface DoubleColumn extends Column {

    DoubleColumn EMPTY = new DoubleDirectColumn();

    double get(long index);

    default double[] toArray() {
        int size = Util.toIntIndex(size());
        double[] array = new double[size];

        for (int i = 0; i < size; i++) {
            array[i] = get(i);
        }

        return array;
    }
}