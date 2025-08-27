package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import it.unimi.dsi.fastutil.longs.LongArrayList;
import org.apache.arrow.util.VisibleForTesting;

import java.util.List;

public class RangeLocal extends Plan1<Table, Table> {

    @VisibleForTesting
    public RangeLocal(Expression constant) {
        this(new Scalar(), constant);
        Util.verify(constant.getLayout() instanceof Scalar);
    }

    public RangeLocal(Plan source, Expression count) {
        super(source, List.of(count));
    }

    @Override
    protected Meta meta() {
        Schema source = Schema.inputs(this, 0);
        Schema number = Schema.of(ColumnType.DOUBLE);
        return new Meta(Schema.of(source, number));
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    public Table execute(Table source) {
        DoubleColumn counts = expression(0, 0).evaluate();
        int size = Util.toIntSize(source.size());
        LongArrayList refs = new LongArrayList(size);
        DoubleArrayList numbers = new DoubleArrayList(size);

        for (int i = 0; i < size; i++) {
            int count = getCount(counts, i);

            for (int j = 0; j < count; j++) {
                refs.add(i);
                numbers.add(j + 1.0);
            }
        }

        Table lefts = LocalTable.indirectOf(source, refs);
        LocalTable right = new LocalTable(new DoubleDirectColumn(numbers));

        return LocalTable.compositeOf(lefts, right);
    }

    private static int getCount(DoubleColumn column, long index) {
        double value = column.get(index);
        int integer = (int) value;

        if (integer != value) {
            throw new IllegalArgumentException("Invalid argument \"count\" for function RANGE: expected an integer number.");
        }

        if (integer < 0) {
            throw new IllegalArgumentException("The count cannot be negative");
        }

        return integer;
    }
}