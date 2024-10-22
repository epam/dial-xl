package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.Period;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import it.unimi.dsi.fastutil.longs.LongArrayList;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;

import java.util.List;
import java.util.stream.IntStream;

public class Explode extends Plan1<Table, Table> {

    public Explode(Plan source, Get column) {
        super(source, List.of(column));
    }

    public Get getColumn() {
        return (Get) expression(0, 0);
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        Schema left = Schema.inputs(this, 0);
        Schema right = Schema.of(ColumnType.STRING, ColumnType.DATE, ColumnType.DOUBLE);
        Schema schema = Schema.of(left, right);
        return new Meta(schema);
    }

    @Override
    protected Table execute(Table table) {
        PeriodSeriesColumn column = (PeriodSeriesColumn) getColumn().evaluate();
        int size = Util.toIntSize(table);
        LongArrayList refs = new LongArrayList(size);
        ObjectArrayList<String> periods = new ObjectArrayList<>(size);
        DoubleArrayList timestamps = new DoubleArrayList(size);
        DoubleArrayList values = new DoubleArrayList(size);

        for (int i = 0; i < size; i++) {
            PeriodSeries series = column.get(i);
            if (series == null) {
                continue;
            }

            DoubleColumn points = series.getValues();
            Period period = series.getPeriod();
            double offset = series.getOffset();

            for (int j = 0; j < points.size(); j++) {
                refs.add(i);
                periods.add(period.name());
                timestamps.add(period.getTimestamp(offset++));
                values.add(points.get(j));
            }
        }

        Table left = LocalTable.indirectOf(table, refs);
        Table right = new LocalTable(
                new StringDirectColumn(periods),
                new DoubleDirectColumn(timestamps),
                new DoubleDirectColumn(values)
        );
        return LocalTable.compositeOf(left, right);
    }
}
