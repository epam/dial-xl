package com.epam.deltix.quantgrid.engine.value;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;

public interface StringColumn extends Column {

    StringColumn EMPTY = new StringDirectColumn();

    String get(long index);

    default String[] toArray() {
        int size = Util.toIntIndex(size());
        String[] array = new String[size];

        for (int i = 0; i < size; i++) {
            array[i] = get(i);
        }

        return array;
    }
}