package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Value;
import lombok.experimental.Accessors;

import java.util.List;

@Value
@Accessors(fluent = true)
public class CompiledColumn implements CompiledResult {
    Expression node;
    List<FieldKey> dimensions;

    public ColumnType type() {
        return node.getType();
    }

    @Override
    public CompiledResult withDimensions(List<FieldKey> dimensions) {
        return new CompiledColumn(node, dimensions);
    }
}
