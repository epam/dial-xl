package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.compiler.CompileContext;
import com.epam.deltix.quantgrid.engine.compiler.CompileError;
import com.epam.deltix.quantgrid.engine.compiler.result.format.ColumnFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.GeneralFormat;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;

import java.util.ArrayList;
import java.util.List;

public final class CompiledUnpivotTable extends CompiledAbstractTable {

    private final CompiledTable source;
    private final List<String> columns;
    private final String name;
    private final int nameRef;
    private final String value;
    private final int valueRef;
    private final ColumnFormat valueFormat;

    public CompiledUnpivotTable(CompiledTable source, List<String> columns,
                                String name, int nameRef, String value, int valueRef, ColumnFormat valueFormat) {
        super(
                source.node(),
                source.dimensions(),
                source.hasCurrentReference() ? source.currentReference().getColumn() : REF_NA,
                source.hasQueryReference() ? source.queryReference().getColumn() : REF_NA,
                source.nested()
        );
        this.columns = columns;
        this.source = source;
        this.name = name;
        this.nameRef = nameRef;
        this.value = value;
        this.valueRef = valueRef;
        this.valueFormat = valueFormat;
    }

    @Override
    public String name() {
        return source.name();
    }

    @Override
    public boolean reference() {
        return false;
    }

    @Override
    public boolean assignable() {
        return false;
    }

    @Override
    public CompiledResult field(CompileContext context, String field) {
        CompiledSimpleColumn column = null;

        if (field.equals(name)) {
            Get expression = new Get(source.node(), nameRef);
            column = new CompiledSimpleColumn(expression, dimensions(), GeneralFormat.INSTANCE);
        }

        if (field.equals(value)) {
            Get expression = new Get(source.node(), valueRef);
            column = new CompiledSimpleColumn(expression, dimensions(), valueFormat);
        }

        if (column == null) {
            if (!columns.contains(field)) {
                throw new CompileError("Table does not contain column: " + name);
            }

            return source.field(context, field);
        }

        if (!nested()) {
            return column;
        }

        if (!hasCurrentReference()) {
            SelectLocal select = new SelectLocal(column.node());
            return new CompiledNestedColumn(select, 0, column.format());
        }

        SelectLocal select = new SelectLocal(currentReference(), column.node());
        return new CompiledNestedColumn(select, dimensions(), 0, 1, column.format());
    }

    @Override
    public List<String> fields(CompileContext context) {
        List<String> fields = new ArrayList<>(columns);
        fields.add(name);
        fields.add(value);
        return fields;
    }

    @Override
    public CompiledTable with(Plan node, List<FieldKey> dimensions, int currentRef, int queryRef, boolean nested) {
        CompiledTable newSource = source.with(node, dimensions, currentRef, queryRef, nested);
        int shift = newSource.queryReference().getColumn() - source.queryReference().getColumn();
        return new CompiledUnpivotTable(newSource, columns,
                name, nameRef + shift,
                value, valueRef + shift, valueFormat);
    }
}