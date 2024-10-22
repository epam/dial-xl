package com.epam.deltix.quantgrid.engine.compiler.result.validator;

import com.epam.deltix.quantgrid.engine.compiler.CompileError;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.experimental.UtilityClass;

@UtilityClass
public class SimpleOrNestedValidators {
    public final ResultValidator<CompiledColumn> BOOLEAN = forType(ColumnType.BOOLEAN);
    public final ResultValidator<CompiledColumn> DOUBLE = forType(ColumnType.DOUBLE);
    public final ResultValidator<CompiledColumn> INTEGER = forType(ColumnType.INTEGER);
    public final ResultValidator<CompiledColumn> STRING = forType(ColumnType.STRING);
    public final ResultValidator<CompiledColumn> PERIOD_SERIES = forType(ColumnType.PERIOD_SERIES);
    public final ResultValidator<CompiledColumn> ANY = ResultValidator.genericValidator(result -> {});
    public final ResultValidator<CompiledColumn> STRING_OR_DOUBLE = forTypes(ColumnType.STRING, ColumnType.DOUBLE);

    public ResultValidator<CompiledColumn> forType(ColumnType type) {
        ResultValidator<CompiledColumn> validator = switch (type) {
            case BOOLEAN -> BOOLEAN;
            case DOUBLE -> DOUBLE;
            case INTEGER -> INTEGER;
            case STRING -> STRING;
            case PERIOD_SERIES -> PERIOD_SERIES;
            default -> null;
        };

        if (validator == null) {
            validator = ResultValidator.genericValidator(compiledResult -> {

                if (!ColumnType.isClose(compiledResult.type(), type)) {
                    throw new CompileError("expected value of type %s, but got %s"
                            .formatted(type, compiledResult.type()));
                }
            });
        }

        return validator;
    }

    public ResultValidator<CompiledColumn> forTypes(ColumnType type1, ColumnType type2) {
        return ResultValidator.genericValidator(compiledResult -> {
            if (!ColumnType.isClose(compiledResult.type(), type1)
                    && !ColumnType.isClose(compiledResult.type(), type2)) {
                throw new CompileError("expected value of type %s or %s, but got %s"
                        .formatted(type1, type2, compiledResult.type()));
            }
        });
    }

}
