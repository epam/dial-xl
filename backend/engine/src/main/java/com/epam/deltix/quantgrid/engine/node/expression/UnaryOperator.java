package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.node.plan.spark.util.SparkOperators;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.parser.ast.UnaryOperation;
import com.epam.deltix.quantgrid.type.ColumnType;
import org.apache.spark.sql.Column;

public class UnaryOperator extends Expression1<DoubleColumn, DoubleColumn> {

    private final UnaryOperation operation;

    public UnaryOperator(Expression input, UnaryOperation operation) {
        super(input);
        this.operation = operation;
    }

    @Override
    public ColumnType getType() {
        return ColumnType.DOUBLE;
    }

    @Override
    public DoubleColumn evaluate(DoubleColumn column) {
        DoubleOperator operator = DoubleOperator.from(operation);
        return new DoubleLambdaColumn(index -> operator.operate(column.get(index)), column.size());
    }

    @Override
    public Column toSpark() {
        Column column = expression(0).toSpark();
        return SparkOperators.unary(operation, column);
    }

    private interface DoubleOperator {

        double operate(double operand);

        static double neg(double a) {
            return -a;
        }

        static double not(double a) {
            return (a == 0.0) ? 1.0 : 0.0;
        }

        static DoubleOperator from(UnaryOperation op) {
            return switch (op) {
                case NEG -> DoubleOperator::neg;
                case NOT -> DoubleOperator::not;
            };
        }
    }
}