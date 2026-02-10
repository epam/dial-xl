package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Strings;

public class FuzzyScore extends Expression1<StringColumn, DoubleColumn> {

    private final String query;

    public FuzzyScore(Expression source, String query) {
        super(source);
        this.query = query.toLowerCase();
    }

    @Override
    public ColumnType getType() {
        return ColumnType.DOUBLE;
    }

    @Override
    protected DoubleColumn evaluate(StringColumn values) {
        return new DoubleLambdaColumn(index -> {
            String value = values.get(index);
            return Strings.isError(value) ? Strings.toDoubleError(value) : fuzzyScore(value.toLowerCase(), query);
        }, values.size());
    }

    private static double fuzzyScore(String text, String query) {
        double score = 0;

        for (int i = 0, j = -1; i < query.length(); i++) {
            char c = query.charAt(i);
            int k = text.indexOf(c, j);

            if (k == -1) {
                break;
            }

            score += (k == j) ? 3 : 1;
            j = k + 1;
        }

        return score;
    }
}
