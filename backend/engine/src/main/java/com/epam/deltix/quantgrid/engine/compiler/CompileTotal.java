package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.SimpleColumnValidators;
import com.epam.deltix.quantgrid.parser.TotalKey;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import lombok.experimental.UtilityClass;

@UtilityClass
class CompileTotal {

    CompiledResult compile(CompileContext context, Formula formula) {
        TotalKey key = context.key.totalKey();
        CompiledSimpleColumn result = SimpleColumnValidators.STRING_OR_DOUBLE.convert(context.compileFormula(formula));
        CompileUtil.verify(result.scalar(), "Total formula must be scalar. Field: %s. Number: %d",
                context, key.number());
        return result;
    }
}