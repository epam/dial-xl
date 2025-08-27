package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.compiler.CompileError;
import com.epam.deltix.quantgrid.engine.compiler.CompileUtil;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.parser.FieldKey;

import java.util.List;
import java.util.function.BinaryOperator;

public interface CompiledResult {

    Node node();

    List<FieldKey> dimensions();

    boolean nested();

    /**
     * @return true if the result is reference and can be assigned as row reference.
     */
    boolean reference();

    /**
     * @return true if the result is assignable to column declaration.
     */
    boolean assignable();

    CompiledResult withDimensions(List<FieldKey> dimensions);

    default boolean scalar() {
        return node().getLayout() instanceof Scalar;
    }

    default <T extends CompiledResult> T cast(Class<T> type) {
        return cast(type, (expected, actual) -> "Failed to cast " + actual + " to " + expected);
    }

    default <T extends CompiledResult> T cast(Class<T> type, BinaryOperator<String> errorProvider) {
        if (!type.isInstance(this)) {
            String expected = CompileUtil.getResultTypeDisplayName(type);
            String actual = CompileUtil.getResultTypeDisplayName(this);
            throw new CompileError(errorProvider.apply(expected, actual));
        }

        return type.cast(this);
    }

    default boolean hasSameLayout(CompiledResult other) {
        return this.node().getLayout().semanticEqual(other.node().getLayout(), true);
    }
}
