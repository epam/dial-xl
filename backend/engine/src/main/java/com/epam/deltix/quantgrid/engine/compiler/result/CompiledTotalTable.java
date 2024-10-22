package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.compiler.CompileContext;
import com.epam.deltix.quantgrid.engine.compiler.CompileUtil;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.parser.ast.Formula;

import java.util.ArrayList;
import java.util.List;

public class CompiledTotalTable extends CompiledAbstractTable {

    private final ParsedTable table;
    private final int number;

    /**
     *
     * @param table - the parsed table where the total is defined.
     * @param node - a node with query reference to simulate link view.
     * @param number - the position of the total starting from 1 (from top to bottom).
     */
    public CompiledTotalTable(ParsedTable table, Plan node, int number) {
        this(table, node, number, List.of());
    }

    private CompiledTotalTable(ParsedTable table, Plan node, int number, List<FieldKey> dimensions) {
        super(node, dimensions, REF_NA, 0, false);
        CompileUtil.verify(node.getMeta().getSchema().size() == 1);
        this.table = table;
        this.number = number;
    }

    @Override
    public String name() {
        return "Total(" + table.name() + ", " + number + ")";
    }

    @Override
    public List<String> fields(CompileContext context) {
        List<String> fields = new ArrayList<>();

        for (FieldKey field : table.total().fields()) {
            List<Formula> formulas = table.total().getTotals(field);

            if (formulas.get(number - 1) != null) {
                fields.add(field.fieldName());
            }
        }

        return fields;
    }

    @Override
    public CompiledResult field(CompileContext context, String field) {
        CompiledSimpleColumn total = context.total(table.tableName(), field, number);

        if (!scalar()) {
            Expand expand = new Expand(node, total.node());
            total = new CompiledSimpleColumn(expand, dimensions);
        }

        return total;
    }

    @Override
    public CompiledTable with(Plan node, List<FieldKey> dimensions, int currentRef, int queryRef, boolean nested) {
        CompileUtil.verify(currentRef == REF_NA);
        CompileUtil.verify(queryRef == 0);
        CompileUtil.verify(!nested);
        return new CompiledTotalTable(table, node, number, dimensions);
    }
}