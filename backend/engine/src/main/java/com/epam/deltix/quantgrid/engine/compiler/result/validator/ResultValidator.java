package com.epam.deltix.quantgrid.engine.compiler.result.validator;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.node.expression.Text;
import com.epam.deltix.quantgrid.engine.node.expression.UnaryFunction;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.apache.commons.lang3.StringUtils;
import org.jetbrains.annotations.Nullable;

@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ResultValidator<T extends CompiledResult> {
    private final PropertyValidator<T> propertyValidator;
    @Getter
    private final Class<T> expectedType;
    @Nullable
    private final String typeDisplayName;

    public T convert(CompiledResult result, String errorMessage) {
        if (result instanceof CompiledSimpleColumn column) {
            if (column.type().isDouble() && this == SimpleColumnValidators.STRING) {
                Text text = new Text(
                        column.node(),
                        column.type() == ColumnType.DATE ? ColumnType.DOUBLE : column.type(),
                        null
                );

                result = new CompiledSimpleColumn(text, result.dimensions());
            } else if (column.type().isString() && (this == SimpleColumnValidators.DOUBLE ||
                    this == SimpleColumnValidators.INTEGER || this == SimpleColumnValidators.BOOLEAN)) {

                UnaryFunction value = new UnaryFunction(column.node(), UnaryFunction.Type.VALUE);
                result = new CompiledSimpleColumn(value, result.dimensions());
            }
        }

        T converted = result.cast(expectedType, (expected, actual) -> errorMessage.formatted(
                StringUtils.isBlank(typeDisplayName) ? expected : typeDisplayName, actual));
        propertyValidator.validate(converted);
        return converted;
    }

    public T convert(CompiledResult result) {
        return convert(result, "expected %s, but got %s");
    }

    public ResultValidator<T> withTypeDisplayName(String displayName) {
        return new ResultValidator<>(propertyValidator, expectedType, displayName);
    }

    public static ResultValidator<CompiledSimpleColumn> columnValidator(
            PropertyValidator<CompiledSimpleColumn> propertyValidator) {
        return new ResultValidator<>(propertyValidator, CompiledSimpleColumn.class, null);
    }

    public static ResultValidator<CompiledNestedColumn> nestedColumnValidator(
            PropertyValidator<CompiledNestedColumn> propertyValidator) {
        return new ResultValidator<>(propertyValidator, CompiledNestedColumn.class, null);
    }

    public static ResultValidator<CompiledTable> tableValidator(
            PropertyValidator<CompiledTable> propertyValidator) {
        return new ResultValidator<>(propertyValidator, CompiledTable.class, null);
    }

    public static ResultValidator<CompiledColumn> genericValidator(
            PropertyValidator<CompiledColumn> propertyValidator) {
        return new ResultValidator<>(propertyValidator, CompiledColumn.class, null);
    }

    @FunctionalInterface
    public interface PropertyValidator<Y extends CompiledResult> {
        void validate(Y compiledResult);
    }

    /**
     * Note: this does not work for custom validators.
     * @return null if validator is not nested.
     */
    @Nullable
    public ResultValidator<CompiledSimpleColumn> getFlatColValidator() {
        if (this == NestedColumnValidators.ANY) {
            return SimpleColumnValidators.ANY;
        } else if (this == NestedColumnValidators.DOUBLE) {
            return SimpleColumnValidators.DOUBLE;
        } else if (this == NestedColumnValidators.STRING) {
            return SimpleColumnValidators.STRING;
        } else if (this == NestedColumnValidators.STRING_OR_DOUBLE) {
            return SimpleColumnValidators.STRING_OR_DOUBLE;
        } else if (this == SimpleOrNestedValidators.ANY) {
            return SimpleColumnValidators.ANY;
        } else if (this == SimpleOrNestedValidators.BOOLEAN) {
            return SimpleColumnValidators.BOOLEAN;
        } else if (this == SimpleOrNestedValidators.DOUBLE) {
            return SimpleColumnValidators.DOUBLE;
        } else if (this == SimpleOrNestedValidators.INTEGER) {
            return SimpleColumnValidators.INTEGER;
        } else if (this == SimpleOrNestedValidators.PERIOD_SERIES) {
            return SimpleColumnValidators.PERIOD_SERIES;
        } else if (this == SimpleOrNestedValidators.STRING) {
            return SimpleColumnValidators.STRING;
        } else if (this == SimpleOrNestedValidators.STRING_OR_DOUBLE) {
            return SimpleColumnValidators.STRING_OR_DOUBLE;
        }

        return null;
    }
}
