package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.node.expression.utils.DoubleFunctions;
import com.epam.deltix.quantgrid.engine.node.expression.utils.StringFunctions;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.spark.util.SparkOperators;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;

public class BinaryOperator extends Expression2<Column, Column, DoubleColumn> {

    @Getter
    protected final BinaryOperation operation;

    public BinaryOperator(Expression left, Expression right, BinaryOperation operation) {
        super(left, right);
        this.operation = operation;
    }

    @Override
    public ColumnType getType() {
        return ColumnType.DOUBLE;
    }

    @Override
    protected Plan layout() {
        return expression(0).getLayout();
    }

    public Expression getLeft() {
        return expression(0);
    }

    public Expression getRight() {
        return expression(1);
    }

    public BinaryOperator swapOperands() {
        return new BinaryOperator(getRight(), getLeft(), operation);
    }

    @Override
    protected DoubleColumn evaluate(Column left, Column right) {
        Util.verify(left.size() == right.size());

        if (left instanceof DoubleColumn lefts && right instanceof DoubleColumn rights) {
            DoubleOperator operator = DoubleOperator.from(operation);
            return new DoubleLambdaColumn(index -> operator.operate(lefts.get(index), rights.get(index)), left.size());
        }

        if (left instanceof StringColumn lefts && right instanceof StringColumn rights) {
            StringOperator operator = StringOperator.from(operation);
            return new DoubleLambdaColumn(index -> operator.operate(lefts.get(index), rights.get(index)), left.size());
        }

        throw new IllegalArgumentException("Unsupported types: " + left.getClass() + " and " + right.getClass());
    }

    @Override
    public org.apache.spark.sql.Column toSpark() {
        org.apache.spark.sql.Column left = getLeft().toSpark();
        org.apache.spark.sql.Column right = getRight().toSpark();

        return switch (getLeft().getType()) {
            case DOUBLE -> SparkOperators.doubleBinary(operation, left, right);
            case STRING -> SparkOperators.stringBinary(operation, left, right);
            default -> throw new IllegalArgumentException("Unsupported type: " + getLeft().getType());
        };
    }

    @Override
    public String toString() {
        return operation.name();
    }

    private interface DoubleOperator {

        double operate(double left, double right);

        static DoubleOperator from(BinaryOperation op) {
            return switch (op) {
                case ADD -> DoubleFunctions::add;
                case SUB -> DoubleFunctions::sub;
                case MUL -> DoubleFunctions::mul;
                case DIV -> DoubleFunctions::div;
                case POW -> DoubleFunctions::pow;
                case LT -> DoubleFunctions::lt;
                case GT -> DoubleFunctions::gt;
                case LTE -> DoubleFunctions::lte;
                case GTE -> DoubleFunctions::gte;
                case NEQ -> DoubleFunctions::neq;
                case EQ -> DoubleFunctions::eq;
                case AND -> DoubleFunctions::and;
                case OR -> DoubleFunctions::or;
                case MOD -> DoubleFunctions::mod;
                default -> throw new IllegalArgumentException("Invalid binary operation on doubles: " + op);
            };
        }
    }

    private interface StringOperator {

        double operate(String left, String right);

        static StringOperator from(BinaryOperation op) {
            return switch (op) {
                case LT -> StringFunctions::lt;
                case GT -> StringFunctions::gt;
                case LTE -> StringFunctions::lte;
                case GTE -> StringFunctions::gte;
                case NEQ -> StringFunctions::neq;
                case EQ -> StringFunctions::eq;
                default -> throw new IllegalArgumentException("Invalid binary operation on strings: " + op);
            };
        }
    }
}
