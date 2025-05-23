package com.epam.deltix.quantgrid.engine.compiler.result.validator;

import com.epam.deltix.quantgrid.engine.compiler.CompileError;
import com.epam.deltix.quantgrid.engine.compiler.CompileUtil;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.experimental.UtilityClass;

@UtilityClass
public class SimpleColumnValidators {
    public final ResultValidator<CompiledSimpleColumn> BOOLEAN = forType(ColumnType.BOOLEAN);
    public final ResultValidator<CompiledSimpleColumn> DOUBLE = forType(ColumnType.DOUBLE);
    public final ResultValidator<CompiledSimpleColumn> INTEGER = forType(ColumnType.INTEGER);
    public final ResultValidator<CompiledSimpleColumn> STRING = forType(ColumnType.STRING);
    public final ResultValidator<CompiledSimpleColumn> PERIOD_SERIES = forType(ColumnType.PERIOD_SERIES);
    public final ResultValidator<CompiledSimpleColumn> STRING_OR_DOUBLE = forTypes(ColumnType.STRING, ColumnType.DOUBLE);
    public final ResultValidator<CompiledSimpleColumn> ANY =
            ResultValidator.columnValidator(result -> {}, ResultValidator.NO_CONVERTER);

    public ResultValidator<CompiledSimpleColumn> forType(ColumnType type) {
        ResultValidator<CompiledSimpleColumn> validator = switch (type) {
            case BOOLEAN -> BOOLEAN;
            case DOUBLE -> DOUBLE;
            case INTEGER -> INTEGER;
            case STRING -> STRING;
            case PERIOD_SERIES -> PERIOD_SERIES;
            default -> null;
        };

        if (validator == null) {
            validator = ResultValidator.columnValidator(compiledResult -> {
                if (!ColumnType.isClose(compiledResult.type(), type)) {
                    throw new CompileError("expected %s, but got %s.".formatted(
                            CompileUtil.getColumnTypeDisplayName(type),
                            CompileUtil.getColumnTypeDisplayName(compiledResult.type())));
                }
            }, ResultValidator.columnConverter(type));
        }

        return validator;
    }

    public ResultValidator<CompiledSimpleColumn> forTypes(ColumnType type1, ColumnType type2) {
        return ResultValidator.columnValidator(compiledResult -> {
            if (!ColumnType.isClose(compiledResult.type(), type1)
                    && !ColumnType.isClose(compiledResult.type(), type2)) {
                throw new CompileError("expected %s or %s, but got %s."
                        .formatted(
                                CompileUtil.getColumnTypeDisplayName(type1),
                                CompileUtil.getColumnTypeDisplayName(type2),
                                CompileUtil.getColumnTypeDisplayName(compiledResult.type())));
            }
        }, ResultValidator.NO_CONVERTER);
    }
}