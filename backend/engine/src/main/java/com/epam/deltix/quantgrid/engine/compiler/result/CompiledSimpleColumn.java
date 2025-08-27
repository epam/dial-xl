package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.compiler.result.format.ColumnFormat;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Value;
import lombok.experimental.Accessors;

import java.util.List;
import java.util.function.UnaryOperator;

@Value
@Accessors(fluent = true)
public class CompiledSimpleColumn implements CompiledColumn {
    Expression node;
    List<FieldKey> dimensions;
    ColumnFormat format;

    public ColumnType type() {
        return node.getType();
    }

    @Override
    public Expression expression() {
        return node;
    }

    @Override
    public boolean nested() {
        return false;
    }

    @Override
    public CompiledResult withDimensions(List<FieldKey> dimensions) {
        return new CompiledSimpleColumn(node, dimensions, format);
    }

    @Override
    public CompiledSimpleColumn transform(UnaryOperator<Expression> transform, ColumnFormat format) {
        Expression newNode = transform.apply(node);
        return new CompiledSimpleColumn(newNode, dimensions, format);
    }
}
