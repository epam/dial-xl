package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.compiler.CompileContext;
import com.epam.deltix.quantgrid.engine.compiler.CompileError;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;
import lombok.experimental.Accessors;

import java.util.List;

@Accessors(fluent = true)
public final class CompiledPeriodPointTable extends CompiledAbstractTable {

    private static final String PERIOD_NAME = "period";
    private static final String TIMESTAMP_NAME = "timestamp";
    private static final String VALUE_NAME = "value";

    // it is carried through explode node to be accessed if needed
    // ORIGINAL_PERIOD_SERIES_OFFSET = 1
    private static final int PERIOD_OFFSET = 2;
    private static final int TIMESTAMP_OFFSET = 3;
    private static final int VALUE_OFFSET = 4;

    public CompiledPeriodPointTable(Plan node, List<FieldKey> dimensions,
                                    int currentRef, int queryRef, boolean nested) {
        super(node, dimensions, currentRef, queryRef, nested);
    }

    public Get period() {
        return new Get(node, queryRef + PERIOD_OFFSET);
    }

    public Get timestamp() {
        return new Get(node, queryRef + TIMESTAMP_OFFSET);
    }

    public Get value() {
        return new Get(node, queryRef + VALUE_OFFSET);
    }

    @Override
    public String name() {
        return "PeriodPoint";
    }

    @Override
    public List<String> fields(CompileContext context) {
        return List.of(PERIOD_NAME, TIMESTAMP_NAME, VALUE_NAME);
    }

    @Override
    public CompiledResult field(CompileContext context, String field) {
        CompiledSimpleColumn column = null;

        if (field.equals(PERIOD_NAME)) {
            Get expression = new Get(node, queryRef + PERIOD_OFFSET);
            column = new CompiledSimpleColumn(expression, dimensions());
        }

        if (field.equals(TIMESTAMP_NAME)) {
            Get expression = new Get(node, queryRef + TIMESTAMP_OFFSET);
            column = new CompiledSimpleColumn(expression, dimensions());
        }

        if (field.equals(VALUE_NAME)) {
            Get expression = new Get(node, queryRef + VALUE_OFFSET);
            column = new CompiledSimpleColumn(expression, dimensions());
        }

        if (column == null) {
            throw new CompileError("Unknown field: " + field);
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
    public CompiledTable with(Plan node, List<FieldKey> dimensions, int currentRef, int queryRef, boolean nested) {
        return new CompiledPeriodPointTable(node, dimensions, currentRef, queryRef, nested);
    }
}