package com.epam.deltix.quantgrid.engine.node.expression.utils;

import com.epam.deltix.quantgrid.util.Dates;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Strings;
import lombok.experimental.UtilityClass;

@UtilityClass
public class DoubleFunctions {

    public static double neg(double a) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isEmpty(a)) {
            return 0;
        }

        return -a;
    }

    public static double not(double a) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isEmpty(a)) {
            return 0;
        }

        return (a == 0.0) ? 1.0 : 0.0;
    }

    public double abs(double a) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isEmpty(a)) {
            a = 0;
        }

        return Doubles.normalizeNaN(Math.abs(a));
    }

    public double acos(double a) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isEmpty(a)) {
            a = 0;
        }

        return Doubles.normalizeNaN(Math.acos(a));
    }

    public double asin(double a) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isEmpty(a)) {
            a = 0;
        }

        return Doubles.normalizeNaN(Math.asin(a));
    }

    public double atan(double a) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isEmpty(a)) {
            a = 0;
        }

        return Doubles.normalizeNaN(Math.atan(a));
    }

    public double ceil(double a) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isEmpty(a)) {
            a = 0;
        }

        return Doubles.normalizeNaN(Math.ceil(a));
    }

    public double cos(double a) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isEmpty(a)) {
            a = 0;
        }

        return Doubles.normalizeNaN(Math.cos(a));
    }

    public double exp(double a) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isEmpty(a)) {
            a = 0;
        }

        return Doubles.normalizeNaN(Math.exp(a));
    }

    public double floor(double a) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isEmpty(a)) {
            a = 0;
        }

        return Doubles.normalizeNaN(Math.floor(a));
    }

    public double log(double a) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isEmpty(a) || a <= 0) {
            return Doubles.ERROR_NA;
        }

        return Doubles.normalizeNaN(Math.log(a));
    }

    public double log10(double a) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isEmpty(a) || a <= 0) {
            return Doubles.ERROR_NA;
        }

        return Doubles.normalizeNaN(Math.log10(a));
    }

    public double sin(double a) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isEmpty(a)) {
            a = 0;
        }

        return Doubles.normalizeNaN(Math.sin(a));
    }

    public double sqrt(double a) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isEmpty(a)) {
            a = 0;
        }

        return Doubles.normalizeNaN(Math.sqrt(a));
    }

    public double tan(double a) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isEmpty(a)) {
            a = 0;
        }

        return Doubles.normalizeNaN(Math.tan(a));
    }

    public double add(double a, double b) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isError(b)) {
            return b;
        }

        if (Doubles.isEmpty(a)) {
            a = 0.0;
        }

        if (Doubles.isEmpty(b)) {
            b = 0.0;
        }

        return a + b;
    }

    public double sub(double a, double b) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isError(b)) {
            return b;
        }

        if (Doubles.isEmpty(a)) {
            a = 0.0;
        }

        if (Doubles.isEmpty(b)) {
            b = 0.0;
        }

        return a - b;
    }

    public double mul(double a, double b) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isError(b)) {
            return b;
        }

        if (Doubles.isEmpty(a)) {
            a = 0.0;
        }

        if (Doubles.isEmpty(b)) {
            b = 0.0;
        }

        return a * b;
    }

    public double div(double a, double b) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isError(b)) {
            return b;
        }

        if (Doubles.isEmpty(a)) {
            a = 0.0;
        }

        if (Doubles.isEmpty(b) || b == 0.0) {
            return Doubles.ERROR_NA; // #DIV/0!
        }

        return a / b;
    }

    public double pow(double a, double b) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isError(b)) {
            return b;
        }

        if (Doubles.isEmpty(a)) {
            a = 0.0;
        }

        if (Doubles.isEmpty(b)) {
            b = 0.0;
        }

        return Doubles.normalizeNaN(Math.pow(a, b));
    }

    public double lt(double a, double b) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isError(b)) {
            return b;
        }

        if (Doubles.isEmpty(a) || Doubles.isEmpty(b)) {
            return 0.0;
        }

        return (a < b) ? 1.0 : 0.0;
    }

    public double lte(double a, double b) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isError(b)) {
            return b;
        }

        if (Doubles.isEmpty(a) && Doubles.isEmpty(b)) {
            return 1.0;
        }

        if (Doubles.isEmpty(a) || Doubles.isEmpty(b)) {
            return 0.0;
        }

        return (a <= b) ? 1.0 : 0.0;
    }

    public double eq(double a, double b) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isError(b)) {
            return b;
        }

        if (Doubles.isEmpty(a) && Doubles.isEmpty(b)) {
           return 1.0;
        }

        if (Doubles.isEmpty(a) || Doubles.isEmpty(b)) {
            return 0.0;
        }

        return (a == b) ? 1.0 : 0.0;
    }

    public double neq(double a, double b) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isError(b)) {
            return b;
        }

        if (Doubles.isEmpty(a) && Doubles.isEmpty(b)) {
            return 0.0;
        }

        if (Doubles.isEmpty(a) || Doubles.isEmpty(b)) {
            return 1.0;
        }

        return (a == b) ? 0.0 : 1.0;
    }

    public double gt(double a, double b) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isError(b)) {
            return b;
        }

        if (Doubles.isEmpty(a) || Doubles.isEmpty(b)) {
            return 0.0;
        }

        return (a > b) ? 1.0 : 0.0;
    }

    public double gte(double a, double b) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isError(b)) {
            return b;
        }

        if (Doubles.isEmpty(a) && Doubles.isEmpty(b)) {
            return 1.0;
        }

        if (Doubles.isEmpty(a) || Doubles.isEmpty(b)) {
            return 0.0;
        }

        return (a >= b) ? 1.0 : 0.0;
    }

    public double and(double a, double b) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isError(b)) {
            return b;
        }

        if (Doubles.isEmpty(a)) {
            a = 0.0;
        }

        if (Doubles.isEmpty(b)) {
            b = 0.0;
        }

        return (a != 0.0 && b != 0.0) ? 1.0 : 0.0;
    }

    public double or(double a, double b) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isError(b)) {
            return b;
        }

        if (Doubles.isEmpty(a)) {
            a = 0.0;
        }

        if (Doubles.isEmpty(b)) {
            b = 0.0;
        }

        return (a != 0.0 || b != 0.0) ? 1.0 : 0.0;
    }

    public double mod(double a, double b) {
        if (Doubles.isError(a)) {
            return a;
        }

        if (Doubles.isError(b)) {
            return b;
        }

        if (Doubles.isEmpty(a)) {
            a = 0.0;
        }

        if (Doubles.isEmpty(b) || b == 0.0) {
            return Doubles.ERROR_NA; // #DIV/0!
        }

        double result = a % b;

        if (Double.isNaN(result)) {
            return Doubles.ERROR_NA;
        }

        if (result == 0.0) { // or result == -0.0
            return 0.0;
        }

        if (Math.signum(a) == Math.signum((b))) {
            return result;
        }

        return result + b;
    }

    public double round(double value) {
        if (Doubles.isError(value)) {
            return value;
        }

        if (Doubles.isEmpty(value)) {
            value = 0.0;
        }

        return Math.abs(value) < Long.MAX_VALUE
                ? Math.round(value)
                : value;
    }

    public double log(double value, double base) {
        if (Doubles.isError(value)) {
            return value;
        }

        if (Doubles.isError(base)) {
            return base;
        }

        if (Doubles.isEmpty(value) || value <= 0) {
            return Doubles.ERROR_NA;
        }

        if (Doubles.isEmpty(base) || base <= 0) {
            return Doubles.ERROR_NA;
        }

        double result = Math.log(value) / Math.log(base);
        return Doubles.normalizeNaN(result);
    }

    public double value(String input) {
        if (Strings.isError(input)) {
            return Strings.toDoubleError(input);
        }

        if (Strings.isEmpty(input)) {
            return Doubles.EMPTY;
        }

        if ("true".equalsIgnoreCase(input)) {
            return 1;
        }

        if ("false".equalsIgnoreCase(input)) {
            return 0;
        }

        double date = Dates.from(input);
        if (!Doubles.isNa(date)) {
            return date;
        }

        return Doubles.parseDouble(input);
    }
}
