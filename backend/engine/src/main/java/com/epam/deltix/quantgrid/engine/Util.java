package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.Table;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.List;

@UtilityClass
public final class Util {

    public static final long NA_REF = -1;

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
}