package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.util.Strings;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;

import java.util.List;
import java.util.Objects;

public class TextJoin implements AggregateFunction {
    @Override
    public Object aggregate(DoubleColumn rows, List<Column> args, int size) {
        StringColumn valuesColumn = (StringColumn) args.get(0);
        StringColumn delimitersColumn = (StringColumn) args.get(1);
        @SuppressWarnings("unchecked")
        ObjectArrayList<String>[] lists = new ObjectArrayList[size];
        for (int i = 0; i < lists.length; ++i) {
            lists[i] = new ObjectArrayList<>();
        }
        String[] delimiters = new String[size];
        for (long i = 0; i < rows.size(); ++i) {
            int row = Util.toIntIndex(rows.get(i));
            String value = valuesColumn.get(i);
            String delimiter = delimitersColumn.get(i);

            String currentDelimiter = delimiters[row];
            if (lists[row].isEmpty()) {
                delimiters[row] = delimiter;
            } else {
                Util.verify(Objects.equals(currentDelimiter, delimiter), "Inconsistent delimiters.");
            }
            lists[row].add(value);
        }

        String[] results = new String[size];
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < size; ++i) {
            results[i] = join(builder, lists[i], delimiters[i]);
            builder.setLength(0);
            lists[i] = null;
        }

        return results;
    }

    private static String join(StringBuilder builder, List<String> values, String delimiter) {
        if (Strings.isError(delimiter)) {
            return Strings.ERROR_NA;
        }

        if (values.isEmpty()) {
            return Strings.EMPTY;
        }

        for (String value : values) {
            if (Strings.isError(value)) {
                return Strings.ERROR_NA;
            }
        }

        builder.append(values.get(0));
        for (int i = 1; i < values.size(); ++i) {
            builder.append(delimiter).append(values.get(i));
        }
        return builder.toString();
    }
}
