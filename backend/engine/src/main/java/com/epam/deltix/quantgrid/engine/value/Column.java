package com.epam.deltix.quantgrid.engine.value;

import com.epam.deltix.quantgrid.engine.value.local.DoubleIndirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesIndirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringIndirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Strings;
import com.epam.deltix.quantgrid.engine.value.local.StructColumn;
import it.unimi.dsi.fastutil.longs.Long2LongFunction;
import it.unimi.dsi.fastutil.longs.LongArrayList;

public interface Column {

    long size();

    static Column indirectOf(Column column, long[] references) {
        return indirectOf(column, LongArrayList.wrap(references));
    }

    static Column indirectOf(Column column, LongArrayList references) {
        if (column instanceof ErrorColumn errorColumn) {
            return errorColumn.withSize(references.size());
        }

        if (column instanceof DoubleColumn original) {
            return new DoubleIndirectColumn(original, references);
        }

        if (column instanceof StringColumn original) {
            return new StringIndirectColumn(original, references);
        }

        if (column instanceof PeriodSeriesColumn original) {
            return new PeriodSeriesIndirectColumn(original, references);
        }

        if (column instanceof StructColumn original) {
            return new StructColumn(original.getNames(), original.getTypes(),
                    LocalTable.indirectOf(original.getTable(), references));
        }

        throw new IllegalArgumentException("Unsupported column type: " + column.getClass());
    }

    static Column lambdaOf(Column column, Long2LongFunction lambda, long size) {
        if (column instanceof ErrorColumn errorColumn) {
            return errorColumn.withSize(size);
        }

        if (column instanceof DoubleColumn original) {
            return new DoubleLambdaColumn(index -> {
                long ref = lambda.get(index);
                return ref < 0 ? Doubles.ERROR_NA : original.get(ref);
            }, size);
        }

        if (column instanceof StringColumn original) {
            return new StringLambdaColumn(index -> {
                long ref = lambda.get(index);
                return ref < 0 ? Strings.ERROR_NA : original.get(ref);
            }, size);
        }

        if (column instanceof PeriodSeriesColumn original) {
            return new PeriodSeriesLambdaColumn(index -> {
                long ref = lambda.get(index);
                return ref < 0 ? null : original.get(ref);
            }, size);
        }

        if (column instanceof StructColumn original) {
            return new StructColumn(original.getNames(), original.getTypes(),
                    LocalTable.lambdaOf(original.getTable(), lambda, size));
        }

        throw new IllegalArgumentException("Unsupported column type: " + column.getClass());
    }
}