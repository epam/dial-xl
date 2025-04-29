package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.ErrorColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.List;

@UtilityClass
public final class Util {

    public static final long NA_REF = -1;
    public static final long NA_ERROR = -2;

    @SuppressWarnings("unchecked")
    public static <T> T as(Object object, Class<T> type) {
        return type.isInstance(object) ? (T) object : null;
    }

    public static boolean isNa(PeriodSeries value) {
        return value == null;
    }

    public static int toIntSize(Table table) {
        return toIntSize(table.size());
    }

    public static int toIntSize(Column column) {
        return toIntSize(column.size());
    }

    public static int toIntSize(long size) {
        verify(size >= 0 && size < Integer.MAX_VALUE);
        return (int) size;
    }

    public static int toIntSize(double size) {
        int result = (int) size;
        verify(size == result);
        return result;
    }

    public static int toIntIndex(long index) {
        verify(index >= 0 && index < Integer.MAX_VALUE);
        return (int) index;
    }

    public static int toIntIndex(double index) {
        int result = (int) index;
        verify(index == result);
        return result;
    }

    public static void verify(boolean condition) {
        if (!condition) {
            throw new IllegalStateException();
        }
    }

    public static void verify(boolean condition, String message) {
        if (!condition) {
            throw new IllegalStateException(message);
        }
    }

    public static void verify(boolean condition, String message, Object arg) {
        if (!condition) {
            throw new IllegalStateException(message.formatted(arg));
        }
    }

    public static void verify(boolean condition, String message, Object... args) {
        if (!condition) {
            throw new IllegalStateException(message.formatted(args));
        }
    }

    public static <T> List<T> listOf(T element, List<T> other) {
        List<T> list = new ArrayList<>(1 + other.size());
        list.add(element);
        list.addAll(other);
        return list;
    }

    public static <T> List<T> combine(List<T> left, List<T> right) {
        List<T> list = new ArrayList<>(left.size() + right.size());
        list.addAll(left);
        list.addAll(right);
        return list;
    }

    @SafeVarargs
    public static <T> List<T> listSkipNulls(T... elements) {
        List<T> list = new ArrayList<>(elements.length);

        for (T element : elements) {
            if (element != null) {
                list.add(element);
            }
        }

        return list;
    }

    public Column concat(Column first, Column second) {
        long resultSize = first.size() + second.size();
        if (first instanceof DoubleColumn firstColumn && second instanceof DoubleColumn secondColumn) {
            return new DoubleLambdaColumn(
                    i -> i < firstColumn.size() ? firstColumn.get(i) : secondColumn.get(i - firstColumn.size()),
                    resultSize);
        }

        if (first instanceof StringColumn firstColumn && second instanceof StringColumn secondColumn) {
            return new StringLambdaColumn(
                    i -> i < firstColumn.size() ? firstColumn.get(i) : secondColumn.get(i - firstColumn.size()),
                    resultSize);
        }

        if (first instanceof PeriodSeriesColumn firstColumn && second instanceof PeriodSeriesColumn secondColumn) {
            return new PeriodSeriesLambdaColumn(
                    i -> i < firstColumn.size() ? firstColumn.get(i) : secondColumn.get(i - firstColumn.size()),
                    resultSize);
        }

        throw new IllegalArgumentException("Cannot concat column types: " + first.getClass() + " and " + second.getClass());
    }

    public Column throwIfError(Column column) {
        if (column instanceof ErrorColumn errorColumn) {
            throw new IllegalArgumentException(errorColumn.message());
        }

        return column;
    }
}