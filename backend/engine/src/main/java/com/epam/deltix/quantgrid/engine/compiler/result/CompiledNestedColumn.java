package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.compiler.CompileContext;
import com.epam.deltix.quantgrid.engine.compiler.CompileError;
import com.epam.deltix.quantgrid.engine.compiler.CompileUtil;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.type.ColumnType;

import java.util.List;

public class CompiledNestedColumn extends CompiledAbstractTable {

    private final int column;

    public CompiledNestedColumn(Plan node, int column) {
        this(node, List.of(), REF_NA, column);
    }

    public CompiledNestedColumn(Plan node, List<FieldKey> dimensions, int currentRef, int column) {
        super(node, dimensions, currentRef, REF_NA, true);
        this.column = column;
    }

    public ColumnType type() {
        return node.getMeta().getSchema().getType(column);
    }

    @Override
    public String name() {
        return "NestedColumn";
    }

    @Override
    public CompiledResult field(CompileContext context, String name) {
        throw new CompileError("No fields in nested column");
    }

    @Override
    public CompiledColumn flat() {
        CompileUtil.verify(column >= 0);
        Get get = new Get(node, column);
        return new CompiledColumn(get, dimensions);
    }

    @Override
    public CompiledTable with(Plan node, List<FieldKey> dimensions, int currentRef, int queryRef, boolean nested) {
        int size = node.getMeta().getSchema().size();
        CompileUtil.verify(nested, "Can't change nested in nested column");
        CompileUtil.verify((currentRef == REF_NA && size == 1) || (currentRef == 0 && size == 2));
        return new CompiledNestedColumn(node, dimensions, currentRef, (currentRef == REF_NA) ? 0 : 1);
    }
}
