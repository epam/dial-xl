package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.compiler.CompileContext;
import com.epam.deltix.quantgrid.engine.compiler.CompilePivot;
import com.epam.deltix.quantgrid.engine.compiler.CompileUtil;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedField;

import java.util.List;

public class CompiledReferenceTable extends CompiledAbstractTable {

    private final String name;

    public CompiledReferenceTable(String name, Plan node) {
        this(name, node, List.of(), REF_NA, 0, true);
        CompileUtil.verify(node.getMeta().getSchema().size() == 1);
    }

    public CompiledReferenceTable(String name, Plan node, List<FieldKey> dimensions,
                                  int currentRef, int queryRef, boolean nested) {
        super(node, dimensions, currentRef, queryRef, nested);
        this.name = name;
    }

    @Override
    public String name() {
        return name;
    }

    @Override
    public List<String> fields(CompileContext context) {
        return context.parsedTable(name).getFields().stream()
                .map(parsedField -> parsedField.getKey().fieldName())
                .toList();
    }

    @Override
    public List<String> keys(CompileContext context) {
        return context.parsedTable(name).getFields().stream()
                .filter(ParsedField::isKey)
                .map(f -> f.getKey().fieldName())
                .filter(name -> !CompilePivot.PIVOT_NAME.equals(name))
                .toList();
    }

    @Override
    public CompiledResult field(CompileContext context, String field) {
        if (CompilePivot.PIVOT_NAME.equals(field)) {
            return context.field(name, field, true);
        }

        return context.projectQueryField(this, name, field, nested);
    }

    @Override
    public CompiledTable with(Plan node, List<FieldKey> dimensions, int currentRef, int queryRef, boolean nested) {
        return new CompiledReferenceTable(name, node, dimensions, currentRef, queryRef, nested);
    }
}
