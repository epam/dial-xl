package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.compiler.result.format.ColumnFormat;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.StructColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Formatter;
import org.jetbrains.annotations.Nullable;

import java.util.Collections;
import java.util.List;

public class Text extends Expression1<Column, Column> {
    private final ColumnFormat format;

    public Text(Expression source, @Nullable ColumnFormat format) {
        super(source);
        this.format = format;
    }

    @Override
    public ColumnType getType() {
        return ColumnType.STRING;
    }

    @Override
    protected Column evaluate(Column source) {
        if (source instanceof DoubleColumn numbers) {
            return text(numbers, format);
        }

        if (source instanceof StructColumn struct) {
            Table table = struct.getTable();
            List<String> names = struct.getNames();
            List<ColumnType> types = Collections.nCopies(names.size(), ColumnType.STRING);
            StringColumn[] columns = new StringColumn[names.size()];

            for (int i = 0; i < columns.length; i++) {
                DoubleColumn numbers = table.getDoubleColumn(i);
                columns[i] = text(numbers, format);
            }

            return new StructColumn(names, types, new LocalTable(columns));
        }

        throw new IllegalArgumentException("Not expected column type: " + source.getClass());
    }

    @Override
    public String toString() {
        return format == null ? "TEXT()" : ("TEXT(" + format + ")");
    }

    public static StringLambdaColumn text(DoubleColumn source, @Nullable ColumnFormat format) {
        // Lossless formatter is used for formatting raw value in viewport nodes
        Formatter formatter = format == null ? Formatter.LOSSLESS : format.createFormatter();
        return new StringLambdaColumn(i -> Doubles.toString(source.get(i), formatter), source.size());
    }
}
