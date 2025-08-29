package com.epam.deltix.quantgrid.engine.node.plan.spark.util;

import com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.UnaryOperator;
import com.epam.deltix.quantgrid.engine.spark.ScalaUtil;
import com.epam.deltix.quantgrid.engine.spark.SchemaUtil;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import com.epam.deltix.quantgrid.parser.ast.UnaryOperation;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Doubles;
import lombok.experimental.UtilityClass;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.catalyst.expressions.objects.StaticInvoke;
import org.apache.spark.sql.functions;
import org.apache.spark.sql.types.DataType;
import org.apache.spark.sql.types.DataTypes;

@UtilityClass
public class SparkOperators {

    /**
     * Check {@link UnaryOperator} for in-memory implementation.
     */
    public static Column unary(UnaryOperation operation, Column column) {
        return switch (operation) {
            case NEG -> functions.negate(column);
            case NOT -> functions.not(column);
        };
    }

    /**
     * Check {@link BinaryOperator} for in-memory implementation.
     */
    public Column doubleBinary(BinaryOperation operation, Column left, Column right) {
        return switch (operation) {
            case ADD -> left.plus(right);
            case SUB -> left.minus(right);
            case MUL -> left.multiply(right);
            case DIV -> left.divide(right);
            case POW -> functions.pow(left, right);
            case LT -> left.lt(right);
            case GT -> left.gt(right);
            case LTE -> left.leq(right);
            case GTE -> left.geq(right);
            case NEQ -> left.notEqual(right);
            case EQ -> left.equalTo(right);
            case AND -> left.and(right);
            case OR -> left.or(right);
            case MOD -> left.mod(right);
            default -> throw new IllegalArgumentException("Invalid binary operation on doubles: " + operation);
        };
    }


    /**
     * Check {@link BinaryOperator} for in-memory implementation
     */
    public static Column stringBinary(BinaryOperation operation, Column left, Column right) {
        // see org.apache.spark.sql.catalyst.expressions.BinaryComparison.doGenCode
        Column binaryOperation = switch (operation) {
            case LT -> left.lt(right);
            case GT -> left.gt(right);
            case LTE -> left.leq(right);
            case GTE -> left.geq(right);
            case NEQ -> left.notEqual(right);
            case EQ -> left.equalTo(right);
            default -> throw new IllegalArgumentException("Invalid binary operation on strings: " + operation);
        };
        return asDouble(binaryOperation);
    }

    public static Column periodSeries(String functionName, Column source) {
        DataType psDataType = SchemaUtil.sparkDataType(ColumnType.PERIOD_SERIES);

        StaticInvoke function = new StaticInvoke(
                PeriodSeriesFunctions.class,
                psDataType,
                functionName,
                ScalaUtil.seq(source.expr()),
                ScalaUtil.seq(psDataType),
                true,
                true,
                true
        );
        return new Column(function);
    }

    private static Column asDouble(Column column) {
        Column doubleColumn = column.cast(DataTypes.DoubleType);
        return functions.coalesce(doubleColumn, functions.lit(Doubles.ERROR_NA)); // map null to Double.NaN
    }
}
