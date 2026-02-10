package com.epam.quantgrid.input.csv;

import com.epam.deltix.quantgrid.engine.service.input.DataSchema;
import com.epam.deltix.quantgrid.engine.service.input.storage.CsvInputParser;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputUtils;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.type.InputColumnType;
import com.epam.quantgrid.input.api.DataRow;
import com.epam.quantgrid.input.api.DataStream;
import lombok.extern.slf4j.Slf4j;

import java.io.Reader;
import java.util.ArrayList;
import java.util.List;


@Slf4j
public class CsvStream implements DataStream {
    private final List<ColumnType> types;
    private final LocalTable table;
    private final DataRow row;
    private int currentIndex;

    public CsvStream(List<ColumnType> types, LocalTable table) {
        this.types = types;
        this.table = table;
        this.row = new DataRow(types);
    }

    public static CsvStream create(DataSchema schema, Reader reader) {
        List<String> names = new ArrayList<>();
        List<InputColumnType> types = new ArrayList<>();
        for (DataSchema.Column column : schema.getColumns().values()) {
            names.add(column.getColumn());
            types.add(column.getTarget());
        }
        LocalTable table = InputUtils.toLocalTable(
                CsvInputParser.parseCsvInput(reader, null, names, types));
        return new CsvStream(schema.toColumnTypes(), table);
    }

    @Override
    public DataRow next() throws Exception {
        if (currentIndex >= table.size()) {
            return null;
        }

        for (int i = 0; i < row.size(); i++) {
            ColumnType columnType = types.get(i);
            switch (columnType) {
                case STRING -> {
                    String value = table.getStringColumn(i).get(currentIndex);
                    row.setString(i, value);
                }
                case DOUBLE -> {
                    double value = table.getDoubleColumn(i).get(currentIndex);
                    row.setDouble(i, value);
                }
                default -> throw new IllegalArgumentException("Unsupported column type: " + columnType);
            }
        }
        ++currentIndex;
        return row;
    }

    @Override
    public void close() {
    }
}
