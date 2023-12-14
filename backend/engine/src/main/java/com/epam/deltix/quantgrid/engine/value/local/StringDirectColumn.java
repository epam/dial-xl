package com.epam.deltix.quantgrid.engine.value.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;

public class StringDirectColumn implements StringColumn {

    private final ObjectArrayList<String> values;

    public StringDirectColumn(String... array) {
        this.values = ObjectArrayList.of(array);
    }

    public StringDirectColumn(ObjectArrayList<String> list) {
        this.values = list;
    }

    @Override
    public long size() {
        return values.size();
    }

    @Override
    public String get(long index) {
        return values.get(Util.toIntIndex(index));
    }

    @Override
    public String[] toArray() {
        Object[] elements = values.elements();
        if (values.size() == elements.length) {
            return values.elements();
        } else {
            return values.toArray(String[]::new);
        }
    }
}