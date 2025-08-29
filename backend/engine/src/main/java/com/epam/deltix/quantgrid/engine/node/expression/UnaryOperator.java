package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.node.expression.utils.DoubleFunctions;
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

    public Expression getOperand() {
        return expression(0);
    }

    @Override
    public DoubleColumn evaluate(DoubleColumn column) {
        DoubleOperator operator = DoubleOperator.from(operation);
        return new DoubleLambdaColumn(index -> operator.operate(column.get(index)), column.size());
    }

    @Override
    public Column toSpark() {
        Column column = getOperand().toSpark();
        return SparkOperators.unary(operation, column);
    }

    @Override
    public String toString() {
        return operation.name();
    }

    private interface DoubleOperator {

        double operate(double operand);

        static DoubleOperator from(UnaryOperation op) {
            return switch (op) {
                case NEG -> DoubleFunctions::neg;
                case NOT -> DoubleFunctions::not;
            };
        }
    }
}