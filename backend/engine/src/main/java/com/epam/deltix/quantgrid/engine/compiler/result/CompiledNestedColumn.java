package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.compiler.CompileContext;
import com.epam.deltix.quantgrid.engine.compiler.CompileError;
import com.epam.deltix.quantgrid.engine.compiler.CompileUtil;
import com.epam.deltix.quantgrid.engine.compiler.result.format.ColumnFormat;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;
import lombok.experimental.Accessors;

import java.util.List;
import java.util.function.UnaryOperator;

@Accessors(fluent = true)
public class CompiledNestedColumn extends CompiledAbstractTable implements CompiledColumn {

    @Getter
    private final int column;
    @Getter
    private final ColumnFormat format;

    public CompiledNestedColumn(Plan node, int column, ColumnFormat format) {
        this(node, List.of(), REF_NA, column, format);
    }

    public CompiledNestedColumn(Plan node, List<FieldKey> dimensions, int currentRef, int column, ColumnFormat format) {
        super(node, dimensions, currentRef, REF_NA, true);
        this.column = column;
        this.format = format;
    }

    public ColumnType type() {
        return node.getMeta().getSchema().getType(column);
    }

    @Override
    public String name() {
        return "NestedColumn";
    }

    @Override
    public Expression expression() {
        return flat().expression();
    }

    @Override
    public CompiledResult field(CompileContext context, String name) {
        throw new CompileError("No columns in %s array".formatted(CompileUtil.getColumnTypeDisplayName(type())));
    }

    @Override
    public CompiledSimpleColumn flat() {
        CompileUtil.verify(column >= 0);
        Get get = new Get(node, column);
        return new CompiledSimpleColumn(get, dimensions, format);
    }

    @Override
    public CompiledTable with(Plan node, List<FieldKey> dimensions, int currentRef, int queryRef, boolean nested) {
        int size = node.getMeta().getSchema().size();
        CompileUtil.verify(nested, "Internal error: cannot flatten %s array.", CompileUtil.getColumnTypeDisplayName(type()));
        CompileUtil.verify((currentRef == REF_NA && size == 1) || (currentRef == 0 && size == 2));
        return new CompiledNestedColumn(node, dimensions, currentRef, (currentRef == REF_NA) ? 0 : 1, format);
    }

    @Override
    public CompiledColumn transform(UnaryOperator<Expression> transform, ColumnFormat format) {
        Expression newColumn = transform.apply(new Get(node, column));
        SelectLocal select = currentRef == REF_NA
                ? new SelectLocal(newColumn)
                : new SelectLocal(new Get(node, currentRef), newColumn);
        return new CompiledNestedColumn(select, dimensions, currentRef, currentRef == REF_NA ? 0 : 1, format);
    }
}
