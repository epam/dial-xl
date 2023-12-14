package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.compiler.CompileContext;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;

import java.util.ArrayList;
import java.util.List;

public final class CompiledUnpivotTable extends CompiledAbstractTable {

    private final CompiledTable source;
    private final String name;
    private final int nameRef;
    private final String value;
    private final int valueRef;

    public CompiledUnpivotTable(CompiledTable source, String name, int nameRef, String value, int valueRef) {
        super(
                source.node(),
                source.dimensions(),
                source.hasCurrentReference() ? source.currentReference().getColumn() : REF_NA,
                source.hasQueryReference() ? source.queryReference().getColumn() : REF_NA,
                source.nested()
        );
        this.source = source;
        this.name = name;
        this.nameRef = nameRef;
        this.value = value;
        this.valueRef = valueRef;
    }

    @Override
    public String name() {
        return "Unpivot(" + source.name() + ")";
    }

    @Override
    public CompiledResult field(CompileContext context, String field) {
        CompiledColumn column = null;

        if (field.equals(name)) {
            Get expression = new Get(source.node(), nameRef);
            column = new CompiledColumn(expression, dimensions());
        }

        if (field.equals(value)) {
            Get expression = new Get(source.node(), valueRef);
            column = new CompiledColumn(expression, dimensions());
        }

        if (column == null) {
            return source.field(context, field);
        }

        if (!nested()) {
            return column;
        }

        if (!hasCurrentReference()) {
            SelectLocal select = new SelectLocal(column.node());
            return new CompiledNestedColumn(select, 0);
        }

        SelectLocal select = new SelectLocal(currentReference(), column.node());
        return new CompiledNestedColumn(select, dimensions(), 0, 1);
    }

    @Override
    public List<String> fields(CompileContext context) {
        List<String> fields = new ArrayList<>(source.fields(context));
        fields.add(name);
        fields.add(value);
        return fields;
    }

    @Override
    public List<String> keys(CompileContext context) {
        return source.keys(context); // should empty be returned? how to find rows with duplicated keys?
    }

    @Override
    public CompiledTable with(Plan node, List<FieldKey> dimensions, int currentRef, int queryRef, boolean nested) {
        CompiledTable newSource = source.with(node, dimensions, currentRef, queryRef, nested);
        int shift = newSource.queryReference().getColumn() - source.queryReference().getColumn();
        return new CompiledUnpivotTable(newSource, name, nameRef + shift, value, valueRef + shift);
    }
}