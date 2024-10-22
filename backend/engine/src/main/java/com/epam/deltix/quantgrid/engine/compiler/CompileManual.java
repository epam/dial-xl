package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
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

    CompiledTable compile(ParsedTable table, CompiledTable scalar, List<FieldKey> dimensions) {
        verify(table, dimensions);
        int size = table.overrides().values().size();
        RangeLocal range = new RangeLocal(scalar.node(), new Constant(size));
        return new CompiledNestedColumn(range, 0);
    }

    FieldKey dimension(ParsedTable table) {
        return new FieldKey(table.tableName(), "_manual_dimension_031574268");
    }

    boolean isManual(ParsedTable table) {
        return table.decorators().stream().map(ParsedDecorator::decoratorName)
                .anyMatch(MANUAL_TABLE_KEYWORD::equals);
    }

    private void verify(ParsedTable table, List<FieldKey> dimensions) {
        CompileUtil.verify(dimensions.isEmpty(), "Manual tables must not contain any dimensions");
        CompileUtil.verify(table.overrides() != null, "Manual tables require defined overrides");
    }
}
