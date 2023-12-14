package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.compiler.CompileContext;
import com.epam.deltix.quantgrid.engine.compiler.CompileUtil;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.NestedPivotLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SimplePivotLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;
import lombok.experimental.Accessors;

import java.util.List;

@Accessors(fluent = true)
public class CompiledPivotTable extends CompiledAbstractTable {

    @Getter
    private final Plan pivotNames;
    private final int pivotNamesKey;

    private final int pivotName;
    private final int pivotValue;

    public CompiledPivotTable(Plan pivotNames, int pivotNamesKey,
                              Plan pivot, int pivotKey, int pivotName, int pivotValue,
                              List<FieldKey> dimensions) {
        super(pivot, dimensions, pivotKey, REF_NA, true);
        this.pivotNames = pivotNames;
        this.pivotNamesKey = pivotNamesKey;
        this.pivotName = pivotName;
        this.pivotValue = pivotValue;
    }

    public ColumnType pivotType() {
        return node.getMeta().getSchema().getType(pivotValue);
    }

    public Get pivotNamesKey() {
        return new Get(pivotNames, pivotNamesKey);
    }

    public Get pivotName() {
        return new Get(node, pivotName);
    }

    public Get pivotValue() {
        return new Get(node, pivotValue);
    }

    @Override
    public String name() {
        return "Pivot";
    }

    @Override
    public CompiledResult field(CompileContext context, String name) {
        Plan layout = context.layout(dimensions).node().getLayout();
        String[] names = {name};
        Plan pivot = hasCurrentReference()
                ? new NestedPivotLocal(layout, node, currentReference(), pivotName(), pivotValue(),
                pivotNames, pivotNamesKey(), names)
                : new SimplePivotLocal(layout, node, pivotName(), pivotValue(), pivotNames, pivotNamesKey(), names);

        Get column = new Get(pivot, 0);
        return new CompiledColumn(column, dimensions);
    }

    @Override
    public CompiledTable with(Plan node, List<FieldKey> dimensions, int currentRef, int queryRef, boolean nested) {
        CompileUtil.verify(queryRef == REF_NA);
        CompileUtil.verify(nested, "Pivot table can't be dimension or used in formulas");
        CompileUtil.verify(currentRef <= 0);

        int shift = (currentRef == 0 ? 1 : 0);
        return new CompiledPivotTable(
                pivotNames, pivotNamesKey,
                node, currentRef, pivotName + shift, pivotValue + shift,
                dimensions
        );
    }
}
