package com.epam.deltix.quantgrid.engine.compiler.result.validator;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.format.GeneralFormat;
import com.epam.deltix.quantgrid.engine.node.expression.Text;
import com.epam.deltix.quantgrid.engine.node.expression.UnaryFunction;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.apache.commons.lang3.StringUtils;
import org.jetbrains.annotations.Nullable;

import java.util.function.UnaryOperator;

@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ResultValidator<T extends CompiledResult> {
    public static final UnaryOperator<CompiledResult> NO_CONVERTER = x -> x;
    public static final ResultValidator<CompiledResult> ANY =
            new ResultValidator<>(result -> {}, CompiledResult.class, null, NO_CONVERTER);
    private final PropertyValidator<T> propertyValidator;
    @Getter
    private final Class<T> expectedType;
    @Nullable
    private final String typeDisplayName;
    private final UnaryOperator<CompiledResult> implicitConverter;

    public T convert(CompiledResult result, String errorMessage) {
        result = implicitConverter.apply(result);

        T converted = result.cast(expectedType, (expected, actual) -> errorMessage.formatted(
                StringUtils.isBlank(typeDisplayName) ? expected : typeDisplayName, actual));
        propertyValidator.validate(converted);
        return converted;
    }

    public T convert(CompiledResult result) {
        return convert(result, "expected %s, but got %s.");
    }

    public ResultValidator<T> withTypeDisplayName(String displayName) {
        return new ResultValidator<>(propertyValidator, expectedType, displayName, implicitConverter);
    }

    public static ResultValidator<CompiledSimpleColumn> columnValidator(
            PropertyValidator<CompiledSimpleColumn> propertyValidator, UnaryOperator<CompiledResult> implicitConverter) {
        return new ResultValidator<>(propertyValidator, CompiledSimpleColumn.class, null, implicitConverter);
    }

    public static ResultValidator<CompiledNestedColumn> nestedColumnValidator(
            PropertyValidator<CompiledNestedColumn> propertyValidator, UnaryOperator<CompiledResult> implicitConverter) {
        return new ResultValidator<>(propertyValidator, CompiledNestedColumn.class, null, implicitConverter);
    }

    public static ResultValidator<CompiledTable> tableValidator(
            PropertyValidator<CompiledTable> propertyValidator) {
        return new ResultValidator<>(propertyValidator, CompiledTable.class, null, NO_CONVERTER);
    }

    public static ResultValidator<CompiledColumn> genericValidator(
            PropertyValidator<CompiledColumn> propertyValidator, UnaryOperator<CompiledResult> implicitConverter) {
        return new ResultValidator<>(propertyValidator, CompiledColumn.class, null, implicitConverter);
    }

    @FunctionalInterface
    public interface PropertyValidator<Y extends CompiledResult> {
        void validate(Y compiledResult);
    }

    public static UnaryOperator<CompiledResult> columnConverter(ColumnType columnType) {
        return switch (columnType) {
            case STRING -> ResultValidator::convertToString;
            case DOUBLE -> ResultValidator::convertToDouble;
            default -> NO_CONVERTER;
        };
    }

    private static CompiledResult convertToString(CompiledResult result) {
        if (result instanceof CompiledColumn column && column.type().isDouble()) {
            return column.transform(node -> new Text(node, column.format()), GeneralFormat.INSTANCE);
        }

        return result;
    }

    private static CompiledResult convertToDouble(CompiledResult result) {
        if (result instanceof CompiledColumn column && column.type().isString()) {
            return column.transform(node -> new UnaryFunction(node, UnaryFunction.Type.VALUE), column.format());
        }

        return result;
    }
}
