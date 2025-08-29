package com.epam.deltix.quantgrid.engine.compiler.result.validator;

import com.epam.deltix.quantgrid.engine.compiler.CompileError;
import com.epam.deltix.quantgrid.engine.compiler.CompileUtil;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.experimental.UtilityClass;

@UtilityClass
public class SimpleOrNestedValidators {
    public final ResultValidator<CompiledColumn> DOUBLE = forType(ColumnType.DOUBLE);
    public final ResultValidator<CompiledColumn> STRING = forType(ColumnType.STRING);
    public final ResultValidator<CompiledColumn> PERIOD_SERIES = forType(ColumnType.PERIOD_SERIES);
    public final ResultValidator<CompiledColumn> STRING_OR_DOUBLE = forTypes(ColumnType.STRING, ColumnType.DOUBLE);
    public final ResultValidator<CompiledColumn> ANY =
            ResultValidator.genericValidator(result -> {}, ResultValidator.NO_CONVERTER);

    public ResultValidator<CompiledColumn> forType(ColumnType type) {
        ResultValidator<CompiledColumn> validator = switch (type) {
            case DOUBLE -> DOUBLE;
            case STRING -> STRING;
            case PERIOD_SERIES -> PERIOD_SERIES;
            case STRUCT -> throw new IllegalArgumentException("Unsupported type: " + type);
        };

        if (validator == null) {
            validator = ResultValidator.genericValidator(compiledResult -> {

                if (compiledResult.type() != type) {
                    throw new CompileError("expected %s, but got %s.".formatted(
                            CompileUtil.getColumnTypeDisplayName(type),
                            CompileUtil.getColumnTypeDisplayName(compiledResult.type())));
                }
            }, ResultValidator.columnConverter(type));
        }

        return validator;
    }

    public ResultValidator<CompiledColumn> forTypes(ColumnType type1, ColumnType type2) {
        return ResultValidator.genericValidator(compiledResult -> {
            if (compiledResult.type() != type1 && compiledResult.type() != type2) {
                throw new CompileError("expected %s or %s, but got %s.".formatted(
                        CompileUtil.getColumnTypeDisplayName(type1),
                        CompileUtil.getColumnTypeDisplayName(type2),
                        CompileUtil.getColumnTypeDisplayName(compiledResult.type())));
            }
        }, ResultValidator.NO_CONVERTER);
    }

}
