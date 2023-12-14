package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.compiler.CompileError;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.parser.FieldKey;

import java.util.List;

public interface CompiledResult {

    Node node();

    List<FieldKey> dimensions();

    CompiledResult withDimensions(List<FieldKey> dimensions);

    default boolean scalar() {
        return node().getLayout() instanceof Scalar;
    }

    default <T extends CompiledResult> T cast(Class<T> type) {
        if (!type.isInstance(this)) {
            throw new CompileError("Unexpected type: " + getClass());
        }

        return type.cast(this);
    }
}
