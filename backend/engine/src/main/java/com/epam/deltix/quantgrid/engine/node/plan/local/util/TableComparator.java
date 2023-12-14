package com.epam.deltix.quantgrid.engine.node.plan.local.util;

import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import it.unimi.dsi.fastutil.longs.LongComparator;

import java.util.List;

public class TableComparator implements LongComparator {

    private final Selector[] selectors;

    public TableComparator(List<Expression> keys, boolean[] ascending) {
        this.selectors = select(keys, ascending);
    }

    @Override
    public int compare(long left, long right) {
        for (Selector selector : selectors) {
            boolean asc = selector.ascending;
            int result;

            if (selector.doubleColumn != null) {
                DoubleColumn column = selector.doubleColumn;
                double lhs = column.get(left);
                double rhs = column.get(right);
                result = compare(lhs, rhs, asc);
            } else {
                StringColumn column = selector.stringColumn;
                String lhs = column.get(left);
                String rhs = column.get(right);
                result = compare(lhs, rhs, asc);
            }

            if (result != 0) {
                return result;
            }
        }

        return 0;
    }

    private static int compare(double left, double right, boolean ascending) {
        boolean isLeftNa = Double.isNaN(left);
        boolean isRightNa = Double.isNaN(right);

        if (isLeftNa && isRightNa) {
            return 0;
        }

        if (isLeftNa) {
            return 1;
        }

        if (isRightNa) {
            return -1;
        }

        int result = Double.compare(left, right);
        return ascending ? result : -result;
    }

    private static int compare(String left, String right, boolean ascending) {
        if (left == null) {
            return 1;
        }

        if (right == null) {
            return -1;
        }

        int result = left.compareTo(right);
        return ascending ? result : -result;
    }

    private static Selector[] select(List<Expression> keys, boolean[] ascending) {
        Selector[] selectors = new Selector[keys.size()];

        for (int i = 0; i < keys.size(); i++) {
            Column column = keys.get(i).evaluate();
            boolean asc = ascending[i];

            if (column instanceof DoubleColumn doubleColumn) {
                selectors[i] = new Selector(doubleColumn, null, asc);
            } else if (column instanceof StringColumn stringColumn) {
                selectors[i] = new Selector(null, stringColumn, asc);
            } else {
                throw new IllegalArgumentException("Unsupported column type: " + column.getClass());
            }
        }

        return selectors;
    }

    private record Selector(DoubleColumn doubleColumn, StringColumn stringColumn, boolean ascending) {
    }
}
