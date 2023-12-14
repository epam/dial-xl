package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.plan.local.RangeLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedOverride;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import lombok.experimental.UtilityClass;

import java.util.List;

@UtilityClass
public class CompileManual {

    private static final String MANUAL_TABLE_KEYWORD = "manual";
    private static final String MANUAL_DIMENSION_NAME = "_row";

    CompileExplode compileManualTable(String tableName, ParsedOverride overrides,
                                      List<FieldKey> dimensions, CompiledTable scalar) {
        validateManualTable(overrides, dimensions);
        int manualSize = overrides.size();
        FieldKey manualDimension = new FieldKey(tableName, MANUAL_DIMENSION_NAME);
        CompileExplode explode = new CompileExplode(List.of(manualDimension), scalar, true);
        RangeLocal range = new RangeLocal(new Constant(manualSize));
        CompiledNestedColumn compiledDim = new CompiledNestedColumn(range, 0);
        explode.add(compiledDim, manualDimension);
        return explode;
    }

    boolean isManualTable(ParsedTable table) {
        return table.getDecorators().stream()
                .anyMatch(decorator -> MANUAL_TABLE_KEYWORD.equals(decorator.decoratorName()));
    }

    private static void validateManualTable(ParsedOverride overrides, List<FieldKey> dimensions) {
        CompileUtil.verify(dimensions.isEmpty(), "Manual tables must not contain any dimensions");
        CompileUtil.verify(overrides != null, "Manual tables require defined overrides");
    }
}
