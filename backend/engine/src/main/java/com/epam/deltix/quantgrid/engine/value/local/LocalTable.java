package com.epam.deltix.quantgrid.engine.value.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import it.unimi.dsi.fastutil.longs.Long2LongFunction;
import it.unimi.dsi.fastutil.longs.LongArrayList;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class LocalTable implements Table {

    private final Column[] columns;
    private final long size;

    public LocalTable(List<Column> columns) {
        this(columns.toArray(Column[]::new));
    }

    public LocalTable(Column... columns) {
        Util.verify(columns.length > 0);
        long size = columns[0].size();

        for (Column column : columns) {
            Util.verify(size == column.size());
        }

        this.columns = columns;
        this.size = size;
    }

    public LocalTable(long size) {
        this.columns = new Column[0];
        this.size = size;
    }

    @Override
    public long size() {
        return size;
    }

    @Override
    public int getColumnCount() {
        return columns.length;
    }

    @Override
    public Column[] getColumns() {
        return columns;
    }

    @Override
    public Column getColumn(int index) {
        return columns[index];
    }

    @Override
    public DoubleColumn getDoubleColumn(int index) {
        return (DoubleColumn) Util.throwIfError(getColumn(index));
    }

    @Override
    public StringColumn getStringColumn(int index) {
        return (StringColumn) Util.throwIfError(getColumn(index));
    }

    @Override
    public PeriodSeriesColumn getPeriodSeriesColumn(int index) {
        return (PeriodSeriesColumn) Util.throwIfError(getColumn(index));
    }

    public static Table compositeOf(Table... tables) {
        List<Column> columns = new ArrayList<>(tables.length);

        for (Table table : tables) {
            Collections.addAll(columns, table.getColumns());
        }

        return new LocalTable(columns);
    }

    public static Table indirectOf(Table table, long[] references) {
        return indirectOf(table, LongArrayList.wrap(references));
    }

    public static Table indirectOf(Table table, LongArrayList references) {
        Column[] columns = new Column[table.getColumnCount()];

        for (int i = 0; i < columns.length; i++) {
            Column column = table.getColumn(i);
            columns[i] = Column.indirectOf(column, references);
        }

        return (table.getColumnCount() == 0) ? new LocalTable(references.size()) : new LocalTable(columns);
    }

    public static Table lambdaOf(Table table, Long2LongFunction lambda, long size) {
        Column[] columns = new Column[table.getColumnCount()];

        for (int i = 0; i < columns.length; i++) {
            Column column = table.getColumn(i);
            columns[i] = Column.lambdaOf(column, lambda, size);
        }

        return (table.getColumnCount() == 0) ? new LocalTable(size) : new LocalTable(columns);
    }
}