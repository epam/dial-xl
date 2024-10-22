package com.epam.deltix.quantgrid.engine.node.plan.local.util;

import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Strings;
import it.unimi.dsi.fastutil.Pair;
import it.unimi.dsi.fastutil.longs.LongHash;
import it.unimi.dsi.fastutil.objects.ObjectObjectImmutablePair;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;

public class TableHashStrategy implements LongHash.Strategy {
    private static final int SEED = 42;

    private final DoubleColumn[] searchDoubleColumns;
    private final StringColumn[] searchStringColumns;
    private final DoubleColumn[] dataDoubleColumns;
    private final StringColumn[] dataStringColumns;
    private final boolean matchErrors;
    private final boolean matchEmptyWithZero;

    public TableHashStrategy(Pair<DoubleColumn[], StringColumn[]> columns,
                             TableHashStrategy dataStrategy,
                             boolean matchErrors, boolean matchEmptyWithZero) {
        this.searchDoubleColumns = columns.first();
        this.searchStringColumns = columns.second();
        this.dataDoubleColumns = dataStrategy.dataDoubleColumns;
        this.dataStringColumns = dataStrategy.dataStringColumns;
        this.matchErrors = matchErrors;
        this.matchEmptyWithZero = matchEmptyWithZero;
    }

    public TableHashStrategy(Pair<DoubleColumn[], StringColumn[]> columns,
                             boolean matchErrors, boolean matchEmptyWithZero) {
        this.searchDoubleColumns = columns.first();
        this.searchStringColumns = columns.second();
        this.dataDoubleColumns = searchDoubleColumns;
        this.dataStringColumns = searchStringColumns;
        this.matchErrors = matchErrors;
        this.matchEmptyWithZero = matchEmptyWithZero;
    }

    public TableHashStrategy(List<Expression> searchKeys, TableHashStrategy dataStrategy,
                             boolean matchErrors, boolean matchEmptyWithZero) {
        this(selectFromExpressions(searchKeys), dataStrategy, matchErrors, matchEmptyWithZero);
    }

    public TableHashStrategy(List<Expression> keys, boolean matchErrors, boolean matchEmptyWithZero) {
        this(selectFromExpressions(keys), matchErrors, matchEmptyWithZero);
    }

    @Override
    public int hashCode(long index) {
        int hash = SEED;

        for (DoubleColumn column : searchDoubleColumns) {
            double value = column.get(index);

            if (matchEmptyWithZero && Doubles.isEmpty(value) || value == -0.0) {
                value = 0.0;
            }

            hash = 31 * hash + Double.hashCode(value);
        }

        for (StringColumn column : searchStringColumns) {
            String value = column.get(index);
            hash = 31 * hash + Objects.hashCode(value);
        }

        return hash;
    }

    @Override
    public boolean equals(long left, long right) {
        for (int i = 0; i < searchDoubleColumns.length; ++i) {
            double leftValue = searchDoubleColumns[i].get(left);
            double rightValue = dataDoubleColumns[i].get(right);

            if (!matchErrors && (Doubles.isError(leftValue) || Doubles.isError(rightValue))) {
                return false;
            }

            if (matchEmptyWithZero) {
                if (Doubles.isEmpty(leftValue)) {
                    leftValue = 0.0;
                }

                if (Doubles.isEmpty(rightValue)) {
                    rightValue = 0.0;
                }
            }

            if (leftValue == rightValue) {
                continue; // special case -0.0 == 0.0 -> true
            }

            if (Double.doubleToRawLongBits(leftValue) != Double.doubleToRawLongBits(rightValue)) {
                return false;
            }
        }

        for (int i = 0; i < searchStringColumns.length; ++i) {
            String leftValue = searchStringColumns[i].get(left);
            String rightValue = dataStringColumns[i].get(right);

            if (!matchErrors && (Strings.isError(leftValue) || Strings.isError(rightValue))) {
                return false;
            }

            if (!Objects.equals(leftValue, rightValue)) {
                return false;
            }
        }

        return true;
    }

    public static TableHashStrategy fromColumns(List<Column> columns, boolean matchErrors, boolean matchEmptyWithZero) {
        Pair<DoubleColumn[], StringColumn[]> pair = selectFromColumns(columns);
        return new TableHashStrategy(pair, matchErrors, matchEmptyWithZero);
    }

    public static TableHashStrategy fromColumns(List<Column> columns, TableHashStrategy dataStrategy,
                                                boolean matchErrors, boolean matchEmptyWithZero) {
        Pair<DoubleColumn[], StringColumn[]> pair = selectFromColumns(columns);
        return new TableHashStrategy(pair, dataStrategy, matchErrors, matchErrors);
    }

    private static Pair<DoubleColumn[], StringColumn[]> selectFromColumns(List<Column> columns) {
        DoubleColumn[] doubleColumns = new DoubleColumn[columns.size()];
        StringColumn[] stringColumns = new StringColumn[columns.size()];

        int doubleCount = 0;
        int stringCount = 0;

        for (Column column : columns) {
            if (column instanceof DoubleColumn doubleColumn) {
                doubleColumns[doubleCount++] = doubleColumn;
            } else if (column instanceof StringColumn stringColumn) {
                stringColumns[stringCount++] = stringColumn;
            } else {
                throw new IllegalArgumentException("Unsupported column type " + column);
            }
        }

        doubleColumns = Arrays.copyOf(doubleColumns, doubleCount);
        stringColumns = Arrays.copyOf(stringColumns, stringCount);

        return new ObjectObjectImmutablePair<>(doubleColumns, stringColumns);
    }

    private static Pair<DoubleColumn[], StringColumn[]> selectFromExpressions(List<Expression> keys) {
        return selectFromColumns(
                keys.stream()
                        .map(Expression::evaluate)
                        .map(Column.class::cast)
                        .toList()
        );
    }
}
