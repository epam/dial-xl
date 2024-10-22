package com.epam.deltix.quantgrid.engine.compiler.result.validator;

import com.epam.deltix.quantgrid.engine.compiler.CompileError;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.experimental.UtilityClass;

@UtilityClass
public class NestedColumnValidators {
    public final ResultValidator<CompiledNestedColumn> DOUBLE = forType(ColumnType.DOUBLE);
    public final ResultValidator<CompiledNestedColumn> STRING = forType(ColumnType.STRING);
    public final ResultValidator<CompiledNestedColumn> STRING_OR_DOUBLE = forTypes(ColumnType.STRING, ColumnType.DOUBLE);
    public final ResultValidator<CompiledNestedColumn> ANY = ResultValidator.nestedColumnValidator(result -> {});

    public ResultValidator<CompiledNestedColumn> forType(ColumnType type) {
        return ResultValidator.nestedColumnValidator(compiledResult -> {
            if (!ColumnType.isClose(compiledResult.type(), type)) {
                throw new CompileError("expected list of %s values, but got list of %s"
                        .formatted(type, compiledResult.type()));
            }
        });
    }

    public ResultValidator<CompiledNestedColumn> forTypes(ColumnType type1, ColumnType type2) {
        return ResultValidator.nestedColumnValidator(compiledResult -> {
            if (!ColumnType.isClose(compiledResult.type(), type1)
                    && !ColumnType.isClose(compiledResult.type(), type2)) {
                throw new CompileError("expected list of %s or %s values, but got list of %s"
                        .formatted(type1, type2, compiledResult.type()));
            }
        });
    }
}
