package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.compiler.CompileContext;
import com.epam.deltix.quantgrid.engine.compiler.CompileUtil;
import com.epam.deltix.quantgrid.engine.compiler.result.format.ColumnFormat;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.GetByName;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;
import lombok.experimental.Accessors;

import java.util.List;

@Getter
@Accessors(fluent = true)
public class CompiledPivotColumn extends CompiledAbstractTable {

    public static final String PIVOT_NAME = "*";

    private final Plan names;
    private final ColumnFormat pivotFormat;
    private final ColumnType pivotType;

    public CompiledPivotColumn(Plan names,
                               Plan node, ColumnFormat pivotFormat, ColumnType pivotType,
                               int currentRef, List<FieldKey> dimensions, boolean nested) {
        super(node, dimensions, currentRef, REF_NA, nested);
        this.names = names;
        this.pivotFormat = pivotFormat;
        this.pivotType = pivotType;
    }

    @Override
    public String name() {
        return "PivotColumn";
    }

    @Override
    public boolean reference() {
        return false;
    }

    @Override
    public boolean assignable() {
        return true;
    }

    public Get nameColumn() {
        return new Get(names, 0);
    }

    public Get pivotColumn() {
        return new Get(node, currentRef + 1);
    }

    @Override
    public CompiledResult field(CompileContext context, String name) {
        GetByName expression = new GetByName(pivotColumn(), name, pivotType);

        CompiledNestedColumn column = hasCurrentReference()
                ? new CompiledNestedColumn(new SelectLocal(currentReference(), expression), dimensions, 0, 1, pivotFormat)
                : new CompiledNestedColumn(new SelectLocal(expression), dimensions, REF_NA, 0, pivotFormat);

        return nested ? column : column.flat();
    }

    @Override
    public CompiledTable with(Plan node, List<FieldKey> dimensions, int currentRef, int queryRef, boolean nested) {
        CompileUtil.verify(currentRef <= 0);
        CompileUtil.verify(queryRef == REF_NA);
        return new CompiledPivotColumn(names, node, pivotFormat, pivotType, currentRef, dimensions, nested);
    }
}
