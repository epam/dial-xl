package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.engine.compiler.CompileUtil;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.type.ColumnType;

import java.util.function.BinaryOperator;
import java.util.function.UnaryOperator;

public interface CompiledColumn extends CompiledResult {
    ColumnType type();
    Expression expression();
    CompiledColumn transform(UnaryOperator<Expression> transform);

    static CompiledColumn transform(CompiledColumn arg1, CompiledColumn arg2, BinaryOperator<Expression> function) {
        CompileUtil.verifySameLayout(arg1, arg2);
        CompileUtil.verify(arg1.nested() == arg2.nested());

        Expression input1 = arg1.expression();
        Expression input2 = arg2.expression();
        Expression result = function.apply(input1, input2);

        return arg1.transform(ignore -> result);
    }

    static CompiledColumn transform(CompiledColumn arg1, CompiledColumn arg2, CompiledColumn arg3,
                                    TernaryOperator<Expression> function) {
        CompileUtil.verifySameLayout(arg1, arg2);
        CompileUtil.verify(arg1.nested() == arg2.nested());
        CompileUtil.verifySameLayout(arg2, arg3);
        CompileUtil.verify(arg2.nested() == arg3.nested());

        Expression input1 = arg1.expression();
        Expression input2 = arg2.expression();
        Expression input3 = arg3.expression();
        Expression result = function.apply(input1, input2, input3);

        return arg1.transform(ignore -> result);
    }

    interface TernaryOperator<T> {
        T apply(T arg1, T arg2, T arg3);
    }
}
