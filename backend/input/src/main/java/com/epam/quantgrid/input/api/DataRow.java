package com.epam.quantgrid.input.api;

import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.ToString;

import java.util.List;

@ToString
public class DataRow {
    private final List<ColumnType> columnTypes;
    private final String[] strings;
    private final double[] doubles;

    public DataRow(List<ColumnType> columnTypes) {
        this.columnTypes = columnTypes;
        this.strings = new String[columnTypes.size()];
        this.doubles = new double[columnTypes.size()];
    }

    public int size() {
        return columnTypes.size();
    }

    public void setString(int index, String value) {
        verifyString(index);
        strings[index] = value;
    }

    public String getString(int index) {
        verifyString(index);
        return strings[index];
    }

    public void setDouble(int index, double value) {
        verifyDouble(index);
        doubles[index] = value;
    }

    public double getDouble(int index) {
        verifyDouble(index);
        return doubles[index];
    }

    private void verifyString(int index) {
        if (columnTypes.get(index) != ColumnType.STRING) {
            throw new IllegalArgumentException("Column at index " + index + " is not of type STRING");
        }
    }

    private void verifyDouble(int index) {
        if (columnTypes.get(index) != ColumnType.DOUBLE) {
            throw new IllegalArgumentException("Column at index " + index + " is not of type DOUBLE");
        }
    }
}
