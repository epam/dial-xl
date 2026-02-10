package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.compiler.result.format.BooleanFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.ColumnFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.CurrencyFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.DateFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.GeneralFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.PercentageFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.ScientificFormat;
import com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import com.epam.deltix.quantgrid.parser.ast.UnaryOperation;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.experimental.UtilityClass;

import java.util.List;

import static java.util.function.Predicate.not;


@UtilityClass
public class FormatResolver {
    public ColumnFormat resolveFormat(BinaryOperation operation, ColumnFormat left, ColumnFormat right) {
        return switch (operation) {
            case SUB, ADD -> resolveAddFormat(left, right);
            case MUL, DIV -> resolveMulFormat(left, right);
            case POW -> resolveMulFormat(left, left);
            case AND, OR, EQ, NEQ, LT, LTE, GT, GTE -> BooleanFormat.INSTANCE;
            case MOD -> left;
            case CONCAT -> GeneralFormat.INSTANCE;
        };
    }

    public ColumnFormat resolveFormat(UnaryOperation operation, ColumnFormat input) {
        return switch (operation) {
            case NOT -> BooleanFormat.INSTANCE;
            case NEG -> input instanceof BooleanFormat
                    ? GeneralFormat.INSTANCE
                    : input;
        };
    }

    public ColumnFormat resolveDoubleAggregationFormat(AggregateType type, ColumnFormat format) {
        return switch (type) {
            case SUM, AVERAGE, MAX, MIN, GEOMEAN, MEDIAN -> format;
            case STDEVS, STDEVP, CORREL -> GeneralFormat.INSTANCE;
            default -> throw new IllegalArgumentException("Unsupported aggregation for format resolution: %s"
                    .formatted(type));
        };
    }

    public ColumnFormat resolveAggregationFormat(AggregateType type, List<ColumnFormat> args) {
        return switch (type) {
            case SUM, AVERAGE, MAX, MIN, GEOMEAN, MEDIAN, FIRST, LAST, SINGLE, INDEX, MODE, MINBY, MAXBY,
                 PERCENTILE, PERCENTILE_EXC, QUARTILE, QUARTILE_EXC -> args.get(0);
            case PERIODSERIES, COUNT, COUNT_ALL, STDEVS, STDEVP, CORREL -> GeneralFormat.INSTANCE;
            default -> throw new IllegalArgumentException("Unsupported aggregation for format resolution: %s"
                    .formatted(type));
        };
    }

    private ColumnFormat resolveAddFormat(ColumnFormat left, ColumnFormat right) {
        if (left == BooleanFormat.INSTANCE) {
            left = GeneralFormat.INSTANCE;
        }

        if (right == BooleanFormat.INSTANCE) {
            right = GeneralFormat.INSTANCE;
        }

        if (left.getClass() == right.getClass()) {
            if (left.getClass() == DateFormat.class) {
                return GeneralFormat.INSTANCE;
            }

            return left.merge(right);
        }

        return left == GeneralFormat.INSTANCE ? right : left;
    }

    private ColumnFormat resolveMulFormat(ColumnFormat left, ColumnFormat right) {
        boolean isLeftDateOrCurrency = left instanceof DateFormat || left instanceof CurrencyFormat;
        boolean isRightDateOrCurrency = right instanceof DateFormat || right instanceof CurrencyFormat;
        if (isLeftDateOrCurrency) {
            if (isRightDateOrCurrency) {
                return GeneralFormat.INSTANCE;
            }

            return left;
        }

        if (isRightDateOrCurrency) {
            return right;
        }

        if (left.getClass() == right.getClass()
                && (left instanceof PercentageFormat || left instanceof ScientificFormat)) {
            return left.merge(right);
        }

        if (left instanceof ScientificFormat) {
            return left;
        }

        if (right instanceof ScientificFormat) {
            return right;
        }

        return GeneralFormat.INSTANCE;
    }

    public ColumnFormat resolveListFormat(ColumnType type, List<ColumnFormat> formats) {
        if (type != ColumnType.DOUBLE) {
            return GeneralFormat.INSTANCE;
        }

        return formats.stream()
                .filter(not(GeneralFormat.INSTANCE::equals))
                .reduce(ColumnFormat::merge)
                .orElse(GeneralFormat.INSTANCE);
    }
}
