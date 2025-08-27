package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.compiler.CompileContext;
import com.epam.deltix.quantgrid.engine.compiler.CompileUtil;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.parser.FieldKey;

import java.util.List;

public final class CompiledValueTable extends CompiledAbstractTable {

    private final CompiledTable source;
    private final List<String> fields;

    public CompiledValueTable(CompiledTable source, List<String> fields) {
        super(source.node(), source.dimensions(), source.hasCurrentReference() ? source.currentRef() : REF_NA,
                source.hasQueryReference() ? source.queryRef() : REF_NA, source.nested());
        this.source = source;
        this.fields = fields;
    }

    @Override
    public boolean reference() {
        return false;
    }

    @Override
    public boolean assignable() {
        return true;
    }

    @Override
    public String name() {
        return source.name();
    }

    @Override
    public CompiledResult field(CompileContext context, String field) {
        CompileUtil.verify(fields.contains(field), "Missing field");
        return source.field(context, field);
    }

    @Override
    public List<String> fields(CompileContext context) {
        return fields;
    }

    @Override
    public CompiledTable with(Plan node, List<FieldKey> dimensions, int currentRef, int queryRef, boolean nested) {
        CompiledTable newSource = source.with(node, dimensions, currentRef, queryRef, nested);
        return new CompiledValueTable(newSource, fields);
    }
}