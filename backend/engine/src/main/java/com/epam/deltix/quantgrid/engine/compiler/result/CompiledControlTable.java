package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.compiler.CompileContext;
import com.epam.deltix.quantgrid.engine.compiler.CompileError;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedField;

import java.util.List;

public class CompiledControlTable extends CompiledAbstractTable {

    private final String name;

    public CompiledControlTable(String name, Plan node) {
        super(node, List.of(), REF_NA, REF_NA, false);
        this.name = name;
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
    public String name() {
        return name;
    }

    @Override
    public List<String> fields(CompileContext context) {
        return context.parsedTable(name).fields().stream()
                .flatMap(fields -> fields.fields().stream())
                .map(ParsedField::fieldName)
                .toList();
    }

    @Override
    public CompiledResult field(CompileContext context, String field) {
        return context.field(name, field, true);
    }

    @Override
    public CompiledTable with(Plan node, List<FieldKey> dimensions, int currentRef, int queryRef, boolean nested) {
        throw new CompileError("Control table cannot be used in this context");
    }
}