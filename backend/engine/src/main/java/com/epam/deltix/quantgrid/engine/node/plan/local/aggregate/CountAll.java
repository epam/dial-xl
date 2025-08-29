package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import java.util.List;

import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;

public class CountAll implements AggregateFunction {
    @Override
    public double[] aggregate(long rows, List<Column> args) {
        return new double[] {rows};
    }

    @Override
    public double[] aggregate(DoubleColumn rows, List<Column> args, int size) {
        double[] counts = new double[size];

        for (long i = 0; i < rows.size(); i++) {
            int row = (int) rows.get(i);
            counts[row]++;
        }

        return counts;
    }
}