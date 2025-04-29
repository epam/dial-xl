package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Strings;
import it.unimi.dsi.fastutil.doubles.Double2IntOpenHashMap;
import it.unimi.dsi.fastutil.objects.Object2IntOpenHashMap;

import java.util.Arrays;
import java.util.List;

public class Mode implements AggregateFunction {
    @Override
    public Object aggregate(DoubleColumn rows, List<Column> args, int size) {
        Column values = args.get(0);

        if (values instanceof DoubleColumn numbers) {
            Double2IntOpenHashMap[] counts = new Double2IntOpenHashMap[size];
            double[] results = new double[size];
            Arrays.fill(results, Doubles.EMPTY);

            for (long i = 0; i < rows.size(); i++) {
                int row = (int) rows.get(i);
                double number = numbers.get(i);
                Double2IntOpenHashMap count = counts[row];
                double result = results[row];

                if (Doubles.isEmpty(number) || Doubles.isError(result)) {
                    continue;
                }

                if (Doubles.isError(number)) {
                    results[row] = number;
                }

                if (count == null) {
                    count = new Double2IntOpenHashMap();
                    count.defaultReturnValue(0);
                    counts[row] = count;
                }

                int reps = count.addTo(number, 1) + 1;
                if (reps > 1 && reps > count.get(result)) {
                    results[row] = number;
                }
            }

            for (int i = 0; i < size; i++) {
                if (Doubles.isEmpty(results[i])) {
                    results[i] = Doubles.ERROR_NA;
                }
            }

            return results;
        }

        if (values instanceof StringColumn texts) {
            Object2IntOpenHashMap<String>[] counts = new Object2IntOpenHashMap[size];
            String[] results = new String[size];
            Arrays.fill(results, Strings.EMPTY);

            for (long i = 0; i < rows.size(); i++) {
                int row = (int) rows.get(i);
                String text = texts.get(i);
                Object2IntOpenHashMap<String> count = counts[row];
                String result = results[row];

                if (Strings.isEmpty(text) || Strings.isError(result)) {
                    continue;
                }

                if (Strings.isError(text)) {
                    results[row] = text;
                }

                if (count == null) {
                    count = new Object2IntOpenHashMap<>();
                    count.defaultReturnValue(0);
                    counts[row] = count;
                }

                int reps = count.addTo(text, 1) + 1;
                if (reps > 1 && reps > count.getInt(result)) {
                    results[row] = text;
                }
            }

            for (int i = 0; i < size; i++) {
                if (Strings.isEmpty(results[i])) {
                    results[i] = Strings.ERROR_NA;
                }
            }

            return results;
        }

        throw new IllegalArgumentException("Not supported: " + values.getClass());
    }
}