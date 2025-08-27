package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.format.GeneralFormat;
import com.epam.deltix.quantgrid.engine.node.Trace;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.plan.local.RangeLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedDecorator;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import lombok.experimental.UtilityClass;

import java.util.List;

@UtilityClass
public class CompileManual {

    private static final String MANUAL_TABLE_KEYWORD = "manual";

    CompiledTable compile(CompileContext context, ParsedTable table, List<FieldKey> dimensions) {
        verify(table, dimensions);
        int size = table.overrides().values().size();
        RangeLocal range = new RangeLocal(context.scalarLayout().node(), new Constant(size));

        ParsedDecorator decorator = findDecorator(table);
        Trace trace = new Trace(context.computationId(), Trace.Type.COMPUTE, context.key().key(), decorator.span());
        range.getTraces().add(trace);

        return new CompiledNestedColumn(range, 0, GeneralFormat.INSTANCE);
    }

    FieldKey dimension(ParsedTable table) {
        return new FieldKey(table.tableName(), "_manual_dimension_031574268");
    }

    boolean isManual(ParsedTable table) {
        return findDecorator(table) != null;
    }

    private void verify(ParsedTable table, List<FieldKey> dimensions) {
        CompileUtil.verify(dimensions.isEmpty(), "Manual tables must not contain any dimensions");
        CompileUtil.verify(table.overrides() != null, "Manual tables require defined overrides");
    }

    private ParsedDecorator findDecorator(ParsedTable table) {
        return table.decorators().stream()
                .filter(decorator -> MANUAL_TABLE_KEYWORD.equals(decorator.decoratorName()))
                .findFirst()
                .orElse(null);
    }
}
