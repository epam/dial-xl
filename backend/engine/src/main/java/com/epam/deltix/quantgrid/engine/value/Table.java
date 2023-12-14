package com.epam.deltix.quantgrid.engine.value;

import com.epam.deltix.quantgrid.engine.value.local.LocalTable;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public interface Table extends Value {

    long size();

    int getColumnCount();

    Column[] getColumns();

    Column getColumn(int index);

    DoubleColumn getDoubleColumn(int index);

    StringColumn getStringColumn(int index);

    PeriodSeriesColumn getPeriodSeriesColumn(int index);

    default Table select(int[] columns) {
        return new LocalTable(Arrays.stream(columns).mapToObj(this::getColumn).toList());
    }

    default Table add(List<Column> columns) {
        List<Column> result = new ArrayList<>();
        Collections.addAll(result, getColumns());
        result.addAll(columns);
        return new LocalTable(result);
    }
}