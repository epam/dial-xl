package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.compiler.CompileContext;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.parser.FieldKey;

import java.util.List;

public class CompiledRowTable extends CompiledAbstractTable {

    private final CompiledTable source;
    private final CompiledRow row;

    public CompiledRowTable(CompiledTable source, CompiledRow row) {
        super(source.node(), source.dimensions(), source.currentRef(), source.queryRef(), source.nested());
        this.source = source;
        this.row = row;
    }

    @Override
    public String name() {
        return source.name();
    }

    @Override
    public List<String> fields(CompileContext context) {
        return source.fields(context);
    }

    @Override
    public List<String> keys(CompileContext context) {
        return source.keys(context);
    }

    @Override
    public CompiledResult field(CompileContext context, String field) {
        String table = name();
        CompiledResult result = context.field(table, field, true, false);
        CompiledSimpleColumn override = context.override(table, field, row);

        if (override != null) {
            CompiledTable layout = context.table(table);
            Expression expression = layout.scalar() ? override.node() : new Expand(layout.node(), override.node());
            result = new CompiledSimpleColumn(expression, List.of());
        }

        return context.projectQueryResult(this, result, field);
    }

    @Override
    public CompiledTable with(Plan node, List<FieldKey> dimensions, int currentRef, int queryRef, boolean nested) {
        CompiledTable newSource = source.with(node, dimensions, currentRef, queryRef, nested);
        return new CompiledRowTable(newSource, row);
    }
}