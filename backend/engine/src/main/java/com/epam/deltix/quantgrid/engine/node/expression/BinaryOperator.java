package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.spark.util.SparkOperators;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;
import org.jetbrains.annotations.Nullable;

public class BinaryOperator extends Expression2<Column, Column, DoubleColumn> {

    @Getter
    protected final BinaryOperation operation;

    public BinaryOperator(Expression left, Expression right, BinaryOperation operation) {
        super(left, right);
        this.operation = operation;
    }

    @Override
    public ColumnType getType() {
        return operation.isLogical() ? ColumnType.BOOLEAN : ColumnType.DOUBLE;
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
            case DOUBLE, INTEGER, BOOLEAN, DATE -> SparkOperators.doubleBinary(operation, left, right);
            case STRING -> SparkOperators.stringBinary(operation, left, right);
            default -> throw new IllegalArgumentException("Unsupported type: " + getLeft().getType());
        };
    }

    private interface DoubleOperator {

        double operate(double left, double right);

        static double add(double a, double b) {
            return a + b;
        }

        static double sub(double a, double b) {
            return a - b;
        }

        static double mul(double a, double b) {
            return a * b;
        }

        static double div(double a, double b) {
            return a / b;
        }

        static double pow(double a, double b) {
            return Math.pow(a, b);
        }

        static double lt(double a, double b) {
            return (a < b) ? 1.0 : 0.0;
        }

        static double lte(double a, double b) {
            return (a <= b) ? 1.0 : 0.0;
        }

        static double eq(double a, double b) {
            return (a == b) ? 1.0 : 0.0;
        }

        static double neq(double a, double b) {
            return (a != b) ? 1.0 : 0.0;
        }

        static double gt(double a, double b) {
            return (a > b) ? 1.0 : 0.0;
        }

        static double gte(double a, double b) {
            return (a >= b) ? 1.0 : 0.0;
        }

        static double and(double a, double b) {
            return (a != 0.0 && b != 0.0) ? 1.0 : 0.0;
        }

        static double or(double a, double b) {
            return (a != 0.0 || b != 0.0) ? 1.0 : 0.0;
        }

        static double mod(double a, double b) {
            if (a == 0) {
                return 0;
            }
            double res = a % b;
            if (Math.signum(a) == Math.signum((b))) {
                return res;
            }
            return res + b;
        }

        static DoubleOperator from(BinaryOperation op) {
            return switch (op) {
                case ADD -> DoubleOperator::add;
                case SUB -> DoubleOperator::sub;
                case MUL -> DoubleOperator::mul;
                case DIV -> DoubleOperator::div;
                case POW -> DoubleOperator::pow;
                case LT -> DoubleOperator::lt;
                case GT -> DoubleOperator::gt;
                case LTE -> DoubleOperator::lte;
                case GTE -> DoubleOperator::gte;
                case NEQ -> DoubleOperator::neq;
                case EQ -> DoubleOperator::eq;
                case AND -> DoubleOperator::and;
                case OR -> DoubleOperator::or;
                case MOD -> DoubleOperator::mod;
            };
        }
    }

    private interface StringOperator {

        double operate(String left, String right);

        static double lt(@Nullable String a, @Nullable String b) {
            return (a == null) || (b == null) ? Double.NaN : (a.compareTo(b) < 0 ? 1d : 0d);
        }

        static double lte(@Nullable String a, @Nullable String b) {
            return (a == null) || (b == null) ? Double.NaN : (a.compareTo(b) <= 0 ? 1d : 0d);
        }

        static double eq(@Nullable String a, @Nullable String b) {
            return (a == null) || (b == null) ? Double.NaN : (a.equals(b) ? 1d : 0d);
        }

        static double neq(@Nullable String a, @Nullable String b) {
            return (a == null) || (b == null) ? Double.NaN : (a.equals(b) ? 0d : 1d);
        }

        static double gt(@Nullable String a, @Nullable String b) {
            return (a == null) || (b == null) ? Double.NaN : (a.compareTo(b) > 0 ? 1d : 0d);
        }

        static double gte(@Nullable String a, @Nullable String b) {
            return (a == null) || (b == null) ? Double.NaN : (a.compareTo(b) >= 0 ? 1d : 0d);
        }

        static StringOperator from(BinaryOperation op) {
            return switch (op) {
                case LT -> StringOperator::lt;
                case GT -> StringOperator::gt;
                case LTE -> StringOperator::lte;
                case GTE -> StringOperator::gte;
                case NEQ -> StringOperator::neq;
                case EQ -> StringOperator::eq;
                default -> throw new IllegalArgumentException("Invalid binary operation on strings: " + op);
            };
        }
    }
}
