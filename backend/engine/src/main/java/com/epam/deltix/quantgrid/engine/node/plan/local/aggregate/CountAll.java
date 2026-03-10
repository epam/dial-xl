package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import java.util.Collections;
import java.util.List;

import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StructColumn;
import com.epam.deltix.quantgrid.type.ColumnType;

public class CountAll implements AggregateFunction {
    @Override
    public Object aggregate(long rows, List<Column> args) {
        if (args.get(0) instanceof StructColumn struct) {
            List<String> names = struct.getNames();
            List<ColumnType> types = Collections.nCopies(names.size(), ColumnType.DOUBLE);
            List<Column> columns  = Collections.nCopies(names.size(), new DoubleDirectColumn(rows));
            return new StructColumn(names, types, new LocalTable(columns));
        }

        return new double[] {rows};
    }

    @Override
    public Object aggregate(DoubleColumn rows, List<Column> args, int size) {
        double[] counts = new double[size];

        for (long i = 0; i < rows.size(); i++) {
            int row = (int) rows.get(i);
            counts[row]++;
        }

        if (args.get(0) instanceof StructColumn struct) {
            List<String> names = struct.getNames();
            List<ColumnType> types = Collections.nCopies(names.size(), ColumnType.DOUBLE);
            List<Column> columns  = Collections.nCopies(names.size(), new DoubleDirectColumn(counts));
            return new StructColumn(names, types, new LocalTable(columns));
        }

        return counts;
    }
}