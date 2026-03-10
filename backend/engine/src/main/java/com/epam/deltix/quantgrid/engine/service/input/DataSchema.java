package com.epam.deltix.quantgrid.engine.service.input;

import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.type.InputColumnType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.LinkedHashMap;
import java.util.List;

@Data
public class DataSchema {
    private final LinkedHashMap<String, Column> columns = new LinkedHashMap<>();

    public void addColumn(Column column) {
        columns.put(column.column, column);
    }

    public List<ColumnType> toColumnTypes() {
        return columns.values().stream()
                .map(Column::getTarget)
                .map(InputColumnType::toColumnType)
                .toList();
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Column {
        private String column;
        private String type;
        private InputColumnType target = InputColumnType.STRING;
    }
}
